/**
 * 每日報表／總覽用：從多筆 active exam_scopes 中選一筆「目前」段考。
 * 規則：優先 title 含「第三次段考」或 exam_no=3；否則依 exam_no 較大者、sort_order、建立時間。
 */
export type DailyReportExamScopeRow = {
  id: string;
  title: string;
  grade: number;
  term: number;
  exam_no: number;
  sort_order?: number | null;
  created_at?: string | null;
  /** 多筆 active 時報表 API 依此決定優先（可選） */
  updated_at?: string | null;
};

function parseSortOrder(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 9999;
}

export function pickPrimaryActiveExamScopeForDailyReport(
  rows: DailyReportExamScopeRow[],
): DailyReportExamScopeRow | null {
  if (rows.length === 0) return null;

  const scored = rows.map((r) => {
    const title = (r.title ?? "").trim();
    const examNo = Number.isFinite(Number(r.exam_no)) ? Number(r.exam_no) : 0;
    const isThird = title.includes("第三次段考") || examNo === 3;
    const tier = isThird ? 0 : 1;
    const sortOrder = parseSortOrder(r.sort_order);
    const negExam = -examNo;
    return { r: { ...r, exam_no: examNo }, tier, sortOrder, negExam };
  });

  scored.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    if (a.tier === 0) {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      if (a.negExam !== b.negExam) return a.negExam - b.negExam;
      return String(a.r.created_at ?? "").localeCompare(String(b.r.created_at ?? ""));
    }
    if (a.negExam !== b.negExam) return a.negExam - b.negExam;
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return String(a.r.created_at ?? "").localeCompare(String(b.r.created_at ?? ""));
  });

  return scored[0]?.r ?? null;
}
