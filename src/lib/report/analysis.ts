import type { SupabaseClient } from "@supabase/supabase-js";

export type WeakSkill = { skill: string; wrongRate: number };
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

/**
 * 班級弱點分析（TOP 3）
 * 使用既有 schema：
 * exam_scopes -> scope_units -> videos -> quizzes -> student_quiz_attempts -> student_quiz_answers -> quiz_questions
 */
export async function getWeakSkills(
  supabase: SupabaseClient,
  examScopeId: string,
): Promise<WeakSkill[]> {
  const { data: units } = await supabase
    .from("scope_units")
    .select("id")
    .eq("exam_scope_id", examScopeId);
  const unitIds = (units ?? []).map((u: { id: string }) => u.id);
  if (unitIds.length === 0) return [];

  const { data: videos } = await supabase.from("videos").select("id").in("unit_id", unitIds);
  const videoIds = (videos ?? []).map((v: { id: string }) => v.id);
  if (videoIds.length === 0) return [];

  const { data: quizzes } = await supabase.from("quizzes").select("id").in("video_id", videoIds);
  const quizIds = (quizzes ?? []).map((q: { id: string }) => q.id);
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

