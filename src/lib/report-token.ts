/**
 * 家長報告 token（URL 路徑或 ?t=）在複製／貼上時可能含空白或一次解碼遺漏。
 */
export function normalizeReportToken(raw: string | undefined | null): string {
  let t = (raw ?? "").trim();
  if (!t) return t;
  try {
    t = decodeURIComponent(t);
  } catch {
    /* 已是明文 */
  }
  return t.trim();
}
