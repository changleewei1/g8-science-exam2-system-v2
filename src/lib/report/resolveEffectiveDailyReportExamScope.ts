import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import type { ResolvedTeacherReportPreferences } from "@/lib/admin/teacher-report-preferences";
import { getEnv } from "@/lib/env";
import { resolveDailyReportExamScopeFromCandidatesAndPool } from "@/lib/report/dailyReportExamScopeResolution";

export type EffectiveExamScopeApi = {
  id: string;
  title: string;
  /** 無任何 is_active 段考時，從資料庫備援挑選（請盡快啟用正確段考） */
  isFallback?: boolean;
};

/**
 * 與每日報表／buildDailyOverviewPayload 一致：目前實際會用哪個段考（供後台 UI「自動模式目前：…」）。
 */
export async function resolveEffectiveDailyReportExamScope(
  prefs: ResolvedTeacherReportPreferences,
): Promise<EffectiveExamScopeApi | null> {
  const supabase = getSupabaseAdmin();
  const saved = prefs.selectedScopeId?.trim() ?? "";
  const envId = getEnv("DAILY_REPORT_EXAM_SCOPE_ID")?.trim() ?? "";
  const candidates: string[] = [];
  const seen = new Set<string>();
  for (const raw of [saved, envId]) {
    const t = raw.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    candidates.push(t);
  }

  const { row, source } = await resolveDailyReportExamScopeFromCandidatesAndPool(supabase, {
    candidates,
    allowInactiveFallback: true,
  });
  if (!row?.id) return null;
  return {
    id: row.id,
    title: row.title,
    isFallback: source === "inactive_fallback",
  };
}

/** 忽略後台指定與環境變數時，僅從 active 池挑選（供「純演算法」對照） */
export async function resolveSystemAutoPickExamScope(): Promise<{ id: string; title: string } | null> {
  const supabase = getSupabaseAdmin();
  const { row } = await resolveDailyReportExamScopeFromCandidatesAndPool(supabase, {
    candidates: [],
    allowInactiveFallback: false,
  });
  return row?.id ? { id: row.id, title: row.title } : null;
}
