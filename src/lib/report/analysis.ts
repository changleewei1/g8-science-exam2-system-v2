import type { SupabaseClient } from "@supabase/supabase-js";

type WeakSkill = { skill: string; wrongRate: number };
type RiskStudent = {
  student_id: string;
  student_name: string;
  class_name: string | null;
  completion_rate: number;
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

/**
 * 高風險學生（完成率低）
 * 以 student_task_progress 聚合出每位學生任務完成率；若沒有任務資料回傳空陣列。
 */
export async function getAtRiskStudents(
  supabase: SupabaseClient,
): Promise<RiskStudent[]> {
  const { data } = await supabase
    .from("student_task_progress")
    .select("student_id, is_completed");
  if (!data || data.length === 0) return [];

  const stats = new Map<string, { total: number; completed: number }>();
  for (const row of data as { student_id: string; is_completed: boolean }[]) {
    const cur = stats.get(row.student_id) ?? { total: 0, completed: 0 };
    cur.total += 1;
    if (row.is_completed) cur.completed += 1;
    stats.set(row.student_id, cur);
  }

  const risk = [...stats.entries()]
    .map(([student_id, v]) => ({
      student_id,
      completion_rate: v.total === 0 ? 0 : v.completed / v.total,
    }))
    .filter((s) => (s.completion_rate ?? 0) < 0.4)
    .sort((a, b) => a.completion_rate - b.completion_rate)
    .slice(0, 5);

  if (risk.length === 0) return [];

  const ids = risk.map((r) => r.student_id);
  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_name")
    .in("id", ids);
  const byId = new Map<string, { name: string; class_name: string | null }>();
  for (const row of students ?? []) {
    const r = row as { id: string; name: string; class_name: string | null };
    byId.set(r.id, { name: r.name, class_name: r.class_name });
  }

  return risk.map((r) => {
    const s = byId.get(r.student_id);
    return {
      ...r,
      student_name: s?.name ?? r.student_id,
      class_name: s?.class_name ?? null,
    };
  });
}

/**
 * 教學建議生成
 */
export function buildTeacherSuggestions(
  weakSkills: WeakSkill[],
  todayVideoCount: number,
  incompleteCount: number,
): string[] {
  const suggestions: string[] = [];

  if (weakSkills.length > 0) {
    suggestions.push(`優先講解「${weakSkills[0].skill}」相關觀念`);
  }

  if (todayVideoCount === 0) {
    suggestions.push("今日無學習行為，建議安排預習任務或提醒學生");
  }

  if (incompleteCount > 10) {
    suggestions.push("未完成學生偏多，建議課堂前進行提醒或點名確認");
  }

  return suggestions;
}

