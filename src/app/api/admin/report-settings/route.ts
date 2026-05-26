import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import {
  loadTeacherReportPreferences,
  PARENT_EMAIL_SECTION_KEYS,
  patchTeacherReportPreferences,
  serializePreferencesForApi,
  TEACHER_EMAIL_SECTION_KEYS,
  type DailyReportMode,
  type ParentSendMode,
} from "@/lib/admin/teacher-report-preferences";
import {
  resolveEffectiveDailyReportExamScope,
  resolveSystemAutoPickExamScope,
} from "@/lib/report/resolveEffectiveDailyReportExamScope";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isParentSendMode(v: unknown): v is ParentSendMode {
  return v === "manual" || v === "all" || v === "risk_only" || v === "incomplete_only";
}

function isDailyReportMode(v: unknown): v is DailyReportMode {
  return v === "preview" || v === "practice" || v === "sprint" || v === "review";
}

/** 報表段考下拉：國二理化下學期第二／三次段考 */
function isReportExamScopeChoiceTitle(title: string): boolean {
  const t = title.trim();
  if (!t.includes("段考")) return false;
  return (t.includes("第二次") && t.includes("理化")) || (t.includes("第三次") && t.includes("理化"));
}

function parseSectionPatch<K extends string>(
  raw: unknown,
  allowed: readonly K[],
): Partial<Record<K, boolean>> | undefined {
  if (raw === undefined) return undefined;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
  const out: Partial<Record<K, boolean>> = {};
  for (const k of allowed) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "boolean") out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const prefs = await loadTeacherReportPreferences();
    const supabase = getSupabaseAdmin();
    const { data: scopes, error: scopeErr } = await supabase
      .from("exam_scopes")
      .select("id, title, is_active, sort_order")
      .order("sort_order", { ascending: true });
    if (scopeErr) {
      console.warn("[report-settings] exam_scopes", scopeErr.message);
    }
    const examScopes = (scopes ?? [])
      .filter((r: { is_active: boolean }) => (r as { is_active: boolean }).is_active)
      .map((r: { id: string; title: string }) => ({
        id: (r as { id: string }).id,
        title: (r as { title: string }).title,
      }));

    const reportExamScopeChoices = examScopes.filter((s) => isReportExamScopeChoiceTitle(s.title));
    const reportExamScopeDropdown =
      reportExamScopeChoices.length >= 2 ? reportExamScopeChoices : examScopes.filter((s) => s.title.includes("段考"));

    const effectiveExamScope = await resolveEffectiveDailyReportExamScope(prefs);
    const systemAutoPickExamScope = await resolveSystemAutoPickExamScope();

    return NextResponse.json({
      ok: true,
      preferences: serializePreferencesForApi(prefs),
      examScopes,
      reportExamScopeChoices: reportExamScopeDropdown,
      effectiveExamScope,
      systemAutoPickExamScope,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "LOAD_FAILED", message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;

  const sendTime =
    typeof b.sendTime === "string" ? b.sendTime.trim() : typeof b.send_time === "string" ? b.send_time.trim() : undefined;
  if (sendTime !== undefined && !TIME_RE.test(sendTime)) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", message: "sendTime 須為 HH:mm（24 小時制）。" },
      { status: 400 },
    );
  }

  const parentSendModeRaw = b.parentSendMode ?? b.parent_send_mode;
  if (parentSendModeRaw !== undefined && !isParentSendMode(parentSendModeRaw)) {
    return NextResponse.json(
      {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "parentSendMode 須為 manual | all | risk_only | incomplete_only",
      },
      { status: 400 },
    );
  }

  const enabled_sections = parseSectionPatch(b.enabledSections ?? b.enabled_sections, TEACHER_EMAIL_SECTION_KEYS);

  const parent_enabled_sections = parseSectionPatch(
    b.parentEnabledSections ?? b.parent_enabled_sections,
    PARENT_EMAIL_SECTION_KEYS,
  );

  const emailEnabled =
    typeof b.emailEnabled === "boolean"
      ? b.emailEnabled
      : typeof b.email_enabled === "boolean"
        ? b.email_enabled
        : undefined;

  const parentSummaryEnabled =
    typeof b.parentSummaryEnabled === "boolean"
      ? b.parentSummaryEnabled
      : typeof b.parent_summary_enabled === "boolean"
        ? b.parent_summary_enabled
        : undefined;

  const reportModeRaw = b.reportMode ?? b.report_mode;
  if (reportModeRaw !== undefined && !isDailyReportMode(reportModeRaw)) {
    return NextResponse.json(
      {
        ok: false,
        error: "VALIDATION_ERROR",
        message: "reportMode 須為 preview | practice | sprint | review",
      },
      { status: 400 },
    );
  }

  let selected_scope_id: string | null | undefined;
  if (b.selectedScopeId !== undefined || b.selected_scope_id !== undefined) {
    const raw = typeof b.selectedScopeId === "string" ? b.selectedScopeId : b.selected_scope_id;
    if (raw === null) selected_scope_id = null;
    else if (typeof raw === "string") {
      const t = raw.trim();
      selected_scope_id = t === "" ? null : t;
    }
  }

  let selected_unit_ids: string[] | undefined;
  if (b.selectedUnitIds !== undefined || b.selected_unit_ids !== undefined) {
    const raw = b.selectedUnitIds ?? b.selected_unit_ids;
    if (Array.isArray(raw)) {
      selected_unit_ids = raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
    }
  }

  try {
    const updated = await patchTeacherReportPreferences({
      email_enabled: emailEnabled,
      send_time: sendTime,
      enabled_sections,
      parent_summary_enabled: parentSummaryEnabled,
      parent_send_mode: isParentSendMode(parentSendModeRaw) ? parentSendModeRaw : undefined,
      parent_enabled_sections,
      selected_scope_id,
      selected_unit_ids,
      report_mode: isDailyReportMode(reportModeRaw) ? reportModeRaw : undefined,
    });
    const effectiveExamScope = await resolveEffectiveDailyReportExamScope(updated);
    const systemAutoPickExamScope = await resolveSystemAutoPickExamScope();
    return NextResponse.json({
      ok: true,
      preferences: serializePreferencesForApi(updated),
      effectiveExamScope,
      systemAutoPickExamScope,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "PATCH_FAILED", message }, { status: 500 });
  }
}
