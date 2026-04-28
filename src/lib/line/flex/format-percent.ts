/**
 * 將比例或百分比安全格式化成 LINE 顯示用字串（0–100%，固定一位小數）。
 * 避免異常輸入變成 4150% 等不合理顯示。
 *
 * @param value 0–1 小數時設 `isRatio: true`（預設）；若已是 0–100 則 `isRatio: false`
 */
export function formatPercent(
  value: number,
  options?: { isRatio?: boolean },
): string {
  const isRatio = options?.isRatio ?? true;
  let pct = isRatio ? value * 100 : value;
  if (!Number.isFinite(pct)) {
    return "0.0%";
  }
  pct = Math.min(100, Math.max(0, pct));
  return `${pct.toFixed(1)}%`;
}

/** 依「影片完成率」比例（0–1）回傳學習判斷文案 */
export function learningJudgmentFromVideoCompletionRatio(ratio: number): string {
  const p = Number.isFinite(ratio) ? ratio * 100 : 0;
  const clamped = Math.min(100, Math.max(0, p));
  if (clamped < 50) return "進度偏低";
  if (clamped <= 80) return "建議加強";
  return "表現良好";
}
