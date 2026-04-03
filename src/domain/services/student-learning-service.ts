import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type SkillAccuracy = {
  skillCode: string;
  total: number;
  correct: number;
  accuracy: number;
};

/**
 * 學習分析：完成率、測驗通過率、skill_code 答對率（預留弱點分析接口）。
 */
export class StudentLearningService {
  async getVideoCompletionRate(studentId: string, examScopeId: string): Promise<number> {
    const supabase = getSupabaseAdmin();
    const { data: units } = await supabase
      .from("scope_units")
      .select("id")
      .eq("exam_scope_id", examScopeId);
    const unitIds = (units ?? []).map((u: { id: string }) => u.id);
    if (unitIds.length === 0) return 0;

    const { data: videos } = await supabase.from("videos").select("id").in("unit_id", unitIds);
    const videoIds = (videos ?? []).map((v: { id: string }) => v.id);
    if (videoIds.length === 0) return 0;

    const { data: prog } = await supabase
      .from("student_video_progress")
      .select("is_completed")
      .eq("student_id", studentId)
      .in("video_id", videoIds);

    const completed = (prog ?? []).filter((p: { is_completed: boolean }) => p.is_completed).length;
    return Math.round((completed / videoIds.length) * 1000) / 10;
  }

  async getQuizPassRate(studentId: string, examScopeId: string): Promise<number> {
    const supabase = getSupabaseAdmin();
    const { data: units } = await supabase
      .from("scope_units")
      .select("id")
      .eq("exam_scope_id", examScopeId);
    const unitIds = (units ?? []).map((u: { id: string }) => u.id);
    if (unitIds.length === 0) return 0;

    const { data: videos } = await supabase.from("videos").select("id").in("unit_id", unitIds);
    const videoIds = (videos ?? []).map((v: { id: string }) => v.id);
    if (videoIds.length === 0) return 0;

    const { data: quizzes } = await supabase.from("quizzes").select("id").in("video_id", videoIds);
    const quizIds = (quizzes ?? []).map((q: { id: string }) => q.id);
    if (quizIds.length === 0) return 0;

    const { data: attempts } = await supabase
      .from("student_quiz_attempts")
      .select("is_passed")
      .eq("student_id", studentId)
      .in("quiz_id", quizIds)
      .not("submitted_at", "is", null);

    const list = attempts ?? [];
    if (list.length === 0) return 0;
    const passed = list.filter((a: { is_passed: boolean }) => a.is_passed).length;
    return Math.round((passed / list.length) * 1000) / 10;
  }

  async getSkillAccuracies(studentId: string): Promise<SkillAccuracy[]> {
    const supabase = getSupabaseAdmin();
    const { data: attempts } = await supabase
      .from("student_quiz_attempts")
      .select("id")
      .eq("student_id", studentId)
      .not("submitted_at", "is", null);
    const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
    if (attemptIds.length === 0) return [];

    const { data: answers } = await supabase
      .from("student_quiz_answers")
      .select("is_correct, quiz_questions(skill_code)")
      .in("attempt_id", attemptIds);

    const map = new Map<string, { total: number; correct: number }>();
    for (const row of answers ?? []) {
      const r = row as unknown as {
        is_correct: boolean;
        quiz_questions: { skill_code: string } | null;
      };
      const code = r.quiz_questions?.skill_code;
      if (!code) continue;
      const cur = map.get(code) ?? { total: 0, correct: 0 };
      cur.total += 1;
      if (r.is_correct) cur.correct += 1;
      map.set(code, cur);
    }

    return [...map.entries()].map(([skillCode, v]) => ({
      skillCode,
      total: v.total,
      correct: v.correct,
      accuracy: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 1000) / 10,
    }));
  }
}
