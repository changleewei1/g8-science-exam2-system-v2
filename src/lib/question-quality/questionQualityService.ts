import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

/**
 * 觸發資料庫重算單題品質統計（與 question_feedback trigger 相同邏輯）。
 * 用於 API 明確呼叫或批次維運；冪等。
 */
export async function recalculateQuestionQuality(questionId: string): Promise<{ ok: boolean; detail?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.rpc("recalculate_question_quality", { p_question_id: questionId });
  if (error) {
    return { ok: false, detail: error.message };
  }
  return { ok: true };
}

export type QuestionQualityStatsRow = {
  question_id: string;
  helpful_count: number;
  not_related_count: number;
  confusing_count: number;
  wrong_answer_count: number;
  bad_explanation_count: number;
  total_feedback_count: number;
  quality_score: number;
  ai_confidence_score: number;
  review_priority_score: number;
  review_status: string;
  last_feedback_at: string | null;
  updated_at: string;
};

export async function fetchQuestionQualityStats(
  questionId: string,
): Promise<{ ok: true; stats: QuestionQualityStatsRow | null } | { ok: false; detail: string }> {
  const supabase = getSupabaseAdmin();
  const fullSelect =
    "question_id, helpful_count, not_related_count, confusing_count, wrong_answer_count, bad_explanation_count, total_feedback_count, quality_score, ai_confidence_score, review_priority_score, review_status, last_feedback_at, updated_at";

  let { data, error } = await supabase.from("question_quality_stats").select(fullSelect).eq("question_id", questionId).maybeSingle();

  if (
    error &&
    (/total_feedback_count|ai_confidence_score|review_priority_score|last_feedback_at|42703|column/i.test(
      String(error.message ?? ""),
    ) ||
      /schema cache/i.test(String(error.message ?? "")))
  ) {
    const second = await supabase
      .from("question_quality_stats")
      .select(
        "question_id, helpful_count, not_related_count, confusing_count, wrong_answer_count, bad_explanation_count, quality_score, review_status, updated_at",
      )
      .eq("question_id", questionId)
      .maybeSingle();
    data = second.data as typeof data;
    error = second.error;
  }

  if (error) {
    return { ok: false, detail: error.message };
  }
  return { ok: true, stats: (data as QuestionQualityStatsRow | null) ?? null };
}
