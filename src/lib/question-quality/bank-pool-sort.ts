/** 供影片測驗同步、智慧練習抽題共用的品質列（欄位可為 null／缺表時降級） */
export type QuestionQualityStatForPool = {
  question_id: string;
  helpful_count?: number | null;
  quality_score?: number | null;
  review_status?: string | null;
  not_related_count?: number | null;
  confusing_count?: number | null;
  wrong_answer_count?: number | null;
  bad_explanation_count?: number | null;
};

export function isHiddenOrLowQuality(st: QuestionQualityStatForPool | undefined): boolean {
  if (!st) return false;
  if (String(st.review_status ?? "") === "hidden") return true;
  if (Number(st.quality_score ?? 100) < 50) return true;
  return false;
}

function negativeFeedbackTotal(st: QuestionQualityStatForPool | undefined): number {
  if (!st) return 0;
  return (
    Number(st.not_related_count ?? 0) +
    Number(st.wrong_answer_count ?? 0) +
    Number(st.confusing_count ?? 0) +
    Number(st.bad_explanation_count ?? 0)
  );
}

/**
 * 排序：影片 skill 對應優先 → 品質分高 → helpful 多 → 負面回饋少
 */
export function compareBankRowsForQuestionPool(
  a: { id: string; skill_code?: string | null },
  b: { id: string; skill_code?: string | null },
  skillSet: Set<string>,
  qMap: Map<string, QuestionQualityStatForPool>,
): number {
  const ask = String(a.skill_code ?? "").trim();
  const bsk = String(b.skill_code ?? "").trim();
  const ap = skillSet.has(ask) ? 1 : 0;
  const bp = skillSet.has(bsk) ? 1 : 0;
  if (bp !== ap) return bp - ap;

  const sa = qMap.get(a.id);
  const sb = qMap.get(b.id);
  const scoreDiff = Number(sb?.quality_score ?? 100) - Number(sa?.quality_score ?? 100);
  if (scoreDiff !== 0) return scoreDiff > 0 ? 1 : scoreDiff < 0 ? -1 : 0;

  const hDiff = Number(sb?.helpful_count ?? 0) - Number(sa?.helpful_count ?? 0);
  if (hDiff !== 0) return hDiff > 0 ? 1 : hDiff < 0 ? -1 : 0;

  const negA = negativeFeedbackTotal(sa);
  const negB = negativeFeedbackTotal(sb);
  return negA - negB;
}
