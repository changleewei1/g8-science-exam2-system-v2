import type { SupabaseClient } from "@supabase/supabase-js";

import type { DailyReportExamScopeRow } from "@/lib/report/pickPrimaryDailyReportExamScope";

export type DailyReportExamScopeSource =
  | "candidate"
  | "active_pool"
  | "inactive_fallback"
  | null;

export type DailyReportExamScopeResolution = {
  row: DailyReportExamScopeRow | null;
  warnings: string[];
  source: DailyReportExamScopeSource;
};

const EXAM_SCOPE_ROW_FIELDS = "id, title, grade, term, exam_no, sort_order, created_at, updated_at";
const EXAM_SCOPE_WITH_ACTIVE = `${EXAM_SCOPE_ROW_FIELDS}, is_active`;

function dedupeOrderedIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of ids) {
    const t = raw.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function ts(v: string | null | undefined): number {
  if (!v) return 0;
  const n = Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeScopeRow(r: Record<string, unknown>): DailyReportExamScopeRow {
  const examNo = Number.isFinite(Number(r.exam_no)) ? Number(r.exam_no) : 0;
  const grade = Number.isFinite(Number(r.grade)) ? Number(r.grade) : 0;
  const term = Number.isFinite(Number(r.term)) ? Number(r.term) : 0;
  const rawSo = r.sort_order;
  const sortOrder =
    typeof rawSo === "number" && Number.isFinite(rawSo)
      ? rawSo
      : typeof rawSo === "string" && Number.isFinite(Number(rawSo))
        ? Number(rawSo)
        : rawSo === null
          ? null
          : undefined;
  const updatedAt = typeof r.updated_at === "string" ? r.updated_at : null;
  return {
    id: String(r.id ?? ""),
    title: String(r.title ?? "").trim() || "（未命名段考）",
    grade,
    term,
    exam_no: examNo,
    sort_order: sortOrder,
    created_at: r.created_at as string | null | undefined,
    updated_at: updatedAt,
  };
}

/** 多筆 is_active 時：取 updated_at 最新；無 updated_at 則以 created_at；再平手依 exam_no、id */
export function pickActiveExamScopeByLatestUpdated(rows: DailyReportExamScopeRow[]): DailyReportExamScopeRow | null {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0];
  return [...rows].sort((a, b) => {
    const ta = ts(a.updated_at ?? undefined) || ts(a.created_at ?? undefined);
    const tb = ts(b.updated_at ?? undefined) || ts(b.created_at ?? undefined);
    if (tb !== ta) return tb - ta;
    if (b.exam_no !== a.exam_no) return b.exam_no - a.exam_no;
    return String(a.id).localeCompare(String(b.id));
  })[0];
}

async function fetchActiveScopePool(
  supabase: SupabaseClient,
): Promise<{ pool: DailyReportExamScopeRow[]; usedAllGradesFallback: boolean }> {
  const { data: g8Rows, error: g8Err } = await supabase
    .from("exam_scopes")
    .select(EXAM_SCOPE_ROW_FIELDS)
    .eq("is_active", true)
    .eq("grade", 8);
  if (g8Err) console.warn("[dailyReportExamScopeResolution] grade=8 active pool", g8Err.message);

  let pool = (g8Rows ?? []).map((x) => normalizeScopeRow(x as Record<string, unknown>));
  let usedAllGradesFallback = false;
  if (pool.length === 0) {
    const { data: allRows, error: allErr } = await supabase
      .from("exam_scopes")
      .select(EXAM_SCOPE_ROW_FIELDS)
      .eq("is_active", true);
    if (allErr) console.warn("[dailyReportExamScopeResolution] all active pool", allErr.message);
    pool = (allRows ?? []).map((x) => normalizeScopeRow(x as Record<string, unknown>));
    usedAllGradesFallback = pool.length > 0;
  }
  return { pool, usedAllGradesFallback };
}

/** 全表最早建立之一筆（無任何 active 時最後備援） */
async function fetchFirstExamScopeRow(supabase: SupabaseClient): Promise<DailyReportExamScopeRow | null> {
  const { data, error } = await supabase
    .from("exam_scopes")
    .select("id, title, grade, term, exam_no, sort_order, created_at, updated_at")
    .order("created_at", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[dailyReportExamScopeResolution] fetchFirstExamScopeRow", error.message);
    return null;
  }
  if (!data) return null;
  return normalizeScopeRow(data as Record<string, unknown>);
}

/**
 * 與每日報表一致：候選 id（偏好、環境變數）→ 全部 is_active 取 updated_at 最新 → 無 active 則全表最早一筆。
 */
export async function resolveDailyReportExamScopeFromCandidatesAndPool(
  supabase: SupabaseClient,
  params: {
    candidates: string[];
    allowInactiveFallback: boolean;
  },
): Promise<DailyReportExamScopeResolution> {
  const warnings: string[] = [];
  const candidates = dedupeOrderedIds(params.candidates);

  for (const id of candidates) {
    const { data: one, error } = await supabase
      .from("exam_scopes")
      .select(EXAM_SCOPE_WITH_ACTIVE)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      console.warn("[dailyReportExamScopeResolution] candidate fetch", error.message);
      warnings.push(`無法讀取段考（${id}）：${error.message}`);
      continue;
    }
    const raw = one as Record<string, unknown> | null;
    if (!raw) {
      warnings.push(`指定的段考不存在（${id}），已改為自動挑選。`);
      continue;
    }
    if (!raw.is_active) {
      const title = String(raw.title ?? "").trim() || id;
      warnings.push(`段考「${title}」未啟用（is_active=false），已改為自動挑選。`);
      continue;
    }
    const row = normalizeScopeRow(raw);
    if (!row.id) continue;
    warnings.push(`已固定段考：${row.title}`);
    return { row, warnings, source: "candidate" };
  }

  const { pool: activePool, usedAllGradesFallback } = await fetchActiveScopePool(supabase);
  if (usedAllGradesFallback) {
    warnings.push("未找到 grade=8 的 active 段考，已改為使用全部 active 段考挑選。");
  }

  const activePicked = pickActiveExamScopeByLatestUpdated(activePool);
  if (activePicked?.id) {
    return { row: activePicked, warnings, source: "active_pool" };
  }

  if (!params.allowInactiveFallback) {
    return { row: null, warnings, source: null };
  }

  const firstAny = await fetchFirstExamScopeRow(supabase);
  if (firstAny?.id) {
    warnings.push(
      `沒有任何 is_active 段考，已使用資料庫中最早建立的段考「${firstAny.title}」作為備援（請盡快設定 active）。`,
    );
    return { row: firstAny, warnings, source: "inactive_fallback" };
  }

  return { row: null, warnings, source: null };
}
