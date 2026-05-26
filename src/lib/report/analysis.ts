import type { SupabaseClient } from "@supabase/supabase-js";

export type WeakSkill = { skill: string; wrongRate: number };

/** 老師版弱點：含顯示名稱與至少答錯過一題的學生人數 */
export type WeakSkillDetail = {
  skillCode: string;
  skillName: string;
  wrongRate: number;
  affectedStudentCount: number;
};
export type StudentCompletionRow = {
  studentId: string;
  studentName: string;
  className: string | null;
  overallCompletion: number;
};
export type RiskStudent = {
  studentId: string;
  studentName: string;
  className: string | null;
  completionRate: number;
};

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

async function scopeQuizIdsForScopeUnits(
  supabase: SupabaseClient,
  examScopeId: string,
  scopeUnitIds?: string[] | null,
): Promise<string[]> {
  const { data: units } = await supabase.from("scope_units").select("id").eq("exam_scope_id", examScopeId);
  let unitIds = (units ?? []).map((u: { id: string }) => u.id);
  if (scopeUnitIds && scopeUnitIds.length > 0) {
    const allow = new Set(scopeUnitIds);
    unitIds = unitIds.filter((id) => allow.has(id));
  }
  if (unitIds.length === 0) return [];
  const { data: videos } = await supabase.from("videos").select("id").in("unit_id", unitIds);
  const videoIds = (videos ?? []).map((v: { id: string }) => v.id);
  if (videoIds.length === 0) return [];
  const { data: quizzes } = await supabase.from("quizzes").select("id").in("video_id", videoIds);
  return [...new Set((quizzes ?? []).map((q: { id: string }) => q.id))];
}

/**
 * 班級弱點分析（TOP 3）
 * 使用既有 schema：
 * exam_scopes -> scope_units -> videos -> quizzes -> student_quiz_attempts -> student_quiz_answers -> quiz_questions
 */
export async function getWeakSkills(
  supabase: SupabaseClient,
  examScopeId: string,
  scopeUnitIds?: string[] | null,
): Promise<WeakSkill[]> {
  const quizIds = await scopeQuizIdsForScopeUnits(supabase, examScopeId, scopeUnitIds);
  if (quizIds.length === 0) return [];

  const { data: attempts } = await supabase
    .from("student_quiz_attempts")
    .select("id")
    .in("quiz_id", quizIds)
    .not("submitted_at", "is", null);
  const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
  if (attemptIds.length === 0) return [];

  const { data: answers } = await supabase
    .from("student_quiz_answers")
    .select("is_correct, question_id")
    .in("attempt_id", attemptIds);
  if (!answers || answers.length === 0) return [];

  const questionIds = [...new Set(answers.map((a: { question_id: string }) => a.question_id))];
  if (questionIds.length === 0) return [];

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, skill_code")
    .in("id", questionIds);
  const skillByQuestion = new Map<string, string>();
  for (const q of questions ?? []) {
    const row = q as { id: string; skill_code: string | null };
    if (row.skill_code) skillByQuestion.set(row.id, row.skill_code);
  }

  const stats: Record<string, { total: number; wrong: number }> = {};
  for (const row of answers as { is_correct: boolean; question_id: string }[]) {
    const skillCode = skillByQuestion.get(row.question_id);
    if (!skillCode) continue;
    if (!stats[skillCode]) stats[skillCode] = { total: 0, wrong: 0 };
    stats[skillCode].total += 1;
    if (!row.is_correct) stats[skillCode].wrong += 1;
  }

  return Object.entries(stats)
    .map(([skill, v]) => ({
      skill,
      wrongRate: toPercent(v.wrong, v.total),
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, 3);
}

/**
 * 班級弱點 TOP N：skill 中文名、錯誤率、至少答錯一題之學生人數。
 */
export async function getWeakSkillsDetailed(
  supabase: SupabaseClient,
  examScopeId: string,
  topN = 3,
  scopeUnitIds?: string[] | null,
): Promise<WeakSkillDetail[]> {
  const quizIds = await scopeQuizIdsForScopeUnits(supabase, examScopeId, scopeUnitIds);
  if (quizIds.length === 0) return [];

  const { data: attempts } = await supabase
    .from("student_quiz_attempts")
    .select("id, student_id")
    .in("quiz_id", quizIds)
    .not("submitted_at", "is", null);
  const attemptMeta = (attempts ?? []) as { id: string; student_id: string }[];
  if (attemptMeta.length === 0) return [];

  const attemptToStudent = new Map<string, string>();
  const attemptIds: string[] = [];
  for (const a of attemptMeta) {
    attemptToStudent.set(a.id, a.student_id);
    attemptIds.push(a.id);
  }

  const { data: answers } = await supabase
    .from("student_quiz_answers")
    .select("attempt_id, is_correct, question_id")
    .in("attempt_id", attemptIds);
  if (!answers || answers.length === 0) return [];

  const questionIds = [...new Set(answers.map((a: { question_id: string }) => a.question_id))];
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, skill_code")
    .in("id", questionIds);
  const skillByQuestion = new Map<string, string>();
  for (const q of questions ?? []) {
    const row = q as { id: string; skill_code: string | null };
    if (row.skill_code) skillByQuestion.set(row.id, row.skill_code);
  }

  type Agg = { total: number; wrong: number; wrongStudents: Set<string> };
  const bySkill = new Map<string, Agg>();
  for (const row of answers as { attempt_id: string; is_correct: boolean; question_id: string }[]) {
    const skillCode = skillByQuestion.get(row.question_id);
    if (!skillCode) continue;
    const sid = attemptToStudent.get(row.attempt_id);
    if (!sid) continue;
    let agg = bySkill.get(skillCode);
    if (!agg) {
      agg = { total: 0, wrong: 0, wrongStudents: new Set() };
      bySkill.set(skillCode, agg);
    }
    agg.total += 1;
    if (!row.is_correct) {
      agg.wrong += 1;
      agg.wrongStudents.add(sid);
    }
  }

  const codes = [...bySkill.keys()];
  if (codes.length === 0) return [];

  const { data: tags } = await supabase.from("skill_tags").select("code, name").in("code", codes);
  const nameByCode = new Map<string, string>();
  for (const t of tags ?? []) {
    const row = t as { code: string; name: string };
    nameByCode.set(row.code, row.name || row.code);
  }

  return [...bySkill.entries()]
    .map(([skillCode, v]) => ({
      skillCode,
      skillName: nameByCode.get(skillCode) ?? skillCode,
      wrongRate: toPercent(v.wrong, v.total),
      affectedStudentCount: v.wrongStudents.size,
    }))
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, topN);
}

/**
 * 單一學生在段考範圍內答題之弱點技能（結構化），供學生儀表板等使用。
 */
export type StudentWeakSkillDetail = {
  skillCode: string;
  skillName: string;
  wrongRate: number;
  wrongCount: number;
  totalAttempts: number;
};

export async function getStudentWeakSkillDetails(
  supabase: SupabaseClient,
  examScopeId: string,
  studentId: string,
  max = 3,
  scopeUnitIds?: string[] | null,
): Promise<StudentWeakSkillDetail[]> {
  const quizIds = await scopeQuizIdsForScopeUnits(supabase, examScopeId, scopeUnitIds);
  if (quizIds.length === 0) return [];

  const { data: attempts } = await supabase
    .from("student_quiz_attempts")
    .select("id")
    .eq("student_id", studentId)
    .in("quiz_id", quizIds)
    .not("submitted_at", "is", null);
  const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
  if (attemptIds.length === 0) return [];

  const { data: answers } = await supabase
    .from("student_quiz_answers")
    .select("is_correct, question_id")
    .in("attempt_id", attemptIds);
  if (!answers || answers.length === 0) return [];

  const questionIds = [...new Set(answers.map((a: { question_id: string }) => a.question_id))];
  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("id, skill_code")
    .in("id", questionIds);
  const skillByQuestion = new Map<string, string>();
  for (const q of questions ?? []) {
    const row = q as { id: string; skill_code: string | null };
    if (row.skill_code) skillByQuestion.set(row.id, row.skill_code);
  }

  const stats: Record<string, { total: number; wrong: number }> = {};
  for (const row of answers as { is_correct: boolean; question_id: string }[]) {
    const skillCode = skillByQuestion.get(row.question_id);
    if (!skillCode) continue;
    if (!stats[skillCode]) stats[skillCode] = { total: 0, wrong: 0 };
    stats[skillCode].total += 1;
    if (!row.is_correct) stats[skillCode].wrong += 1;
  }

  const codes = Object.keys(stats);
  if (codes.length === 0) return [];

  const { data: tags } = await supabase.from("skill_tags").select("code, name").in("code", codes);
  const nameByCode = new Map<string, string>();
  for (const t of tags ?? []) {
    const row = t as { code: string; name: string };
    nameByCode.set(row.code, row.name || row.code);
  }

  return Object.entries(stats)
    .map(([code, v]) => ({
      skillCode: code,
      skillName: nameByCode.get(code) ?? code,
      wrongRate: toPercent(v.wrong, v.total),
      wrongCount: v.wrong,
      totalAttempts: v.total,
    }))
    .filter((x) => x.wrongRate > 0 && x.totalAttempts >= 1)
    .sort((a, b) => b.wrongRate - a.wrongRate)
    .slice(0, max);
}

/**
 * 單一學生在段考範圍內答題之弱點技能（最多 max 筆），供家長信顯示。
 */
export async function getStudentWeakSkillSummaries(
  supabase: SupabaseClient,
  examScopeId: string,
  studentId: string,
  max = 3,
  scopeUnitIds?: string[] | null,
): Promise<string[]> {
  const details = await getStudentWeakSkillDetails(supabase, examScopeId, studentId, max, scopeUnitIds);
  return details.map((x) => `${x.skillName}（錯誤率 ${(x.wrongRate * 100).toFixed(0)}%）`);
}

export function getAtRiskStudents(
  students: StudentCompletionRow[],
  threshold = 30,
): RiskStudent[] {
  return students
    .filter((s) => (s.overallCompletion ?? 0) < threshold)
    .sort((a, b) => a.overallCompletion - b.overallCompletion)
    .map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      className: s.className,
      completionRate: s.overallCompletion,
    }));
}

/**
 * 教學建議生成
 */
export function buildTeacherSuggestions(
  weakSkills: WeakSkill[],
  todayVideoCount: number,
  incompleteCount: number,
  atRiskCount: number,
  recentTaskCount: number,
  completedCount: number,
): string[] {
  const suggestions: string[] = [];

  if (atRiskCount > 0) {
    suggestions.push("建議優先提醒完成率低於 30% 的學生，確認是否有登入或觀看困難。");
  }

  if (incompleteCount > 0) {
    suggestions.push("建議課堂前提醒尚未完成學生補看影片。");
  }

  if (todayVideoCount === 0 && recentTaskCount === 0) {
    suggestions.push("目前三天內未新增學習任務，可視情況安排下一階段預習任務。");
  }

  if (completedCount >= 5) {
    suggestions.push("可讓已完成學生進入複習或進階練習。");
  }

  if (weakSkills.length > 0) {
    suggestions.push(`可搭配課堂優先講解「${weakSkills[0].skill}」相關概念與題型。`);
  }

  return suggestions;
}

/** 段考範圍內累計答錯題數（歷史，非僅今日） */
export async function countWrongAnswersInScopeQuizzes(
  supabase: SupabaseClient,
  quizIds: string[],
): Promise<number> {
  if (quizIds.length === 0) return 0;
  const { data: attempts, error } = await supabase
    .from("student_quiz_attempts")
    .select("id")
    .in("quiz_id", quizIds)
    .not("submitted_at", "is", null);
  if (error || !attempts?.length) return 0;
  const attemptIds = attempts.map((a: { id: string }) => a.id);
  const batch = 400;
  let sum = 0;
  for (let i = 0; i < attemptIds.length; i += batch) {
    const part = attemptIds.slice(i, i + batch);
    const { count, error: cErr } = await supabase
      .from("student_quiz_answers")
      .select("id", { count: "exact", head: true })
      .in("attempt_id", part)
      .eq("is_correct", false);
    if (!cErr) sum += count ?? 0;
  }
  return sum;
}

