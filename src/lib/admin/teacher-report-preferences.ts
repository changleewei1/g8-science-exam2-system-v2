import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import type { BuildDailyOverviewPayloadOptions } from "@/lib/report/buildDailyOverviewPayload";

export const REPORT_SCOPE_G8_SCIENCE = "g8_science";

/** 與 DB teacher_report_preferences.report_mode 一致 */
export type DailyReportMode = "preview" | "practice" | "sprint" | "review";

export const DAILY_REPORT_MODE_LABELS: Record<DailyReportMode, string> = {
  preview: "預習模式",
  practice: "練習模式",
  sprint: "段考衝刺模式",
  review: "複習模式",
};

/** 老師每日 Email 區塊 key（與 UI / enabled_sections JSON 一致） */
export const TEACHER_EMAIL_SECTION_KEYS = [
  "class_avg_completion",
  "today_videos",
  "today_questions",
  "completed_list",
  "incomplete_list",
  "risk_list",
  "top5",
  "weak_top3",
  "skill_error_breakdown",
  "unwatched_summary",
  "incomplete_tasks",
  "suggestions",
  "admin_link",
] as const;

export type TeacherEmailSectionKey = (typeof TEACHER_EMAIL_SECTION_KEYS)[number];

export const PARENT_EMAIL_SECTION_KEYS = [
  "completion_rate",
  "class_average",
  "today_videos",
  "today_questions",
  "today_accuracy",
  "incomplete_videos_hint",
  "weak_skills",
  "recommended_video",
  "tonight_tasks",
  "teacher_note",
  "question_updates",
] as const;

export type ParentEmailSectionKey = (typeof PARENT_EMAIL_SECTION_KEYS)[number];

export type ParentSendMode = "manual" | "all" | "risk_only" | "incomplete_only";

export type TeacherReportPreferencesRow = {
  id: string;
  teacher_id: string | null;
  report_scope: string;
  email_enabled: boolean;
  send_time: string;
  enabled_sections: Record<string, boolean>;
  parent_summary_enabled: boolean;
  parent_send_mode: ParentSendMode;
  parent_enabled_sections: Record<string, boolean>;
  selected_scope_id?: string | null;
  selected_unit_ids?: unknown;
  report_mode?: string;
  created_at: string;
  updated_at: string;
};

function allTrue<K extends string>(keys: readonly K[]): Record<K, boolean> {
  return Object.fromEntries(keys.map((k) => [k, true])) as Record<K, boolean>;
}

export const DEFAULT_TEACHER_SECTIONS: Record<TeacherEmailSectionKey, boolean> =
  allTrue(TEACHER_EMAIL_SECTION_KEYS);

export const DEFAULT_PARENT_SECTIONS: Record<ParentEmailSectionKey, boolean> =
  allTrue(PARENT_EMAIL_SECTION_KEYS);

function mergeSections<K extends string>(
  defaults: Record<K, boolean>,
  fromDb: unknown,
): Record<K, boolean> {
  const out = { ...defaults };
  if (fromDb && typeof fromDb === "object" && !Array.isArray(fromDb)) {
    for (const k of Object.keys(defaults) as K[]) {
      const v = (fromDb as Record<string, unknown>)[k];
      if (typeof v === "boolean") out[k] = v;
    }
  }
  return out;
}

function normalizeSendMode(raw: unknown): ParentSendMode {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s === "all" || s === "risk_only" || s === "incomplete_only" || s === "manual") return s;
  return "manual";
}

export function modeAllowsTeacherSection(mode: DailyReportMode, key: TeacherEmailSectionKey): boolean {
  const M: Record<DailyReportMode, TeacherEmailSectionKey[]> = {
    preview: [
      "class_avg_completion",
      "today_videos",
      "today_questions",
      "completed_list",
      "incomplete_list",
      "admin_link",
    ],
    practice: [
      "class_avg_completion",
      "today_questions",
      "weak_top3",
      "skill_error_breakdown",
      "suggestions",
      "admin_link",
    ],
    sprint: [
      "class_avg_completion",
      "risk_list",
      "incomplete_list",
      "weak_top3",
      "unwatched_summary",
      "suggestions",
      "admin_link",
    ],
    review: ["class_avg_completion", "weak_top3", "skill_error_breakdown", "suggestions", "admin_link"],
  };
  return M[mode].includes(key);
}

export function intersectSectionsWithReportMode(
  mode: DailyReportMode,
  teacherPrefs: Record<TeacherEmailSectionKey, boolean>,
): Record<TeacherEmailSectionKey, boolean> {
  const out = { ...teacherPrefs };
  for (const k of Object.keys(out) as TeacherEmailSectionKey[]) {
    out[k] = teacherPrefs[k] !== false && modeAllowsTeacherSection(mode, k);
  }
  return out;
}

function normalizeReportMode(raw: unknown): DailyReportMode {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (s === "practice" || s === "sprint" || s === "review" || s === "preview") return s;
  return "preview";
}

function parseSelectedUnitIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim());
}

export type ResolvedTeacherReportPreferences = {
  rowId: string;
  emailEnabled: boolean;
  sendTime: string;
  teacherSections: Record<TeacherEmailSectionKey, boolean>;
  parentSummaryEnabled: boolean;
  parentSendMode: ParentSendMode;
  parentSections: Record<ParentEmailSectionKey, boolean>;
  selectedScopeId: string | null;
  selectedUnitIds: string[];
  reportMode: DailyReportMode;
};

export function resolveTeacherReportPreferences(
  row: TeacherReportPreferencesRow | null,
): ResolvedTeacherReportPreferences {
  if (!row) {
    return {
      rowId: "",
      emailEnabled: true,
      sendTime: "21:00",
      teacherSections: { ...DEFAULT_TEACHER_SECTIONS },
      parentSummaryEnabled: false,
      parentSendMode: "manual",
      parentSections: { ...DEFAULT_PARENT_SECTIONS },
      selectedScopeId: null,
      selectedUnitIds: [],
      reportMode: "preview",
    };
  }
  return {
    rowId: row.id,
    emailEnabled: row.email_enabled,
    sendTime: row.send_time || "21:00",
    teacherSections: mergeSections(DEFAULT_TEACHER_SECTIONS, row.enabled_sections),
    parentSummaryEnabled: row.parent_summary_enabled,
    parentSendMode: normalizeSendMode(row.parent_send_mode),
    parentSections: mergeSections(DEFAULT_PARENT_SECTIONS, row.parent_enabled_sections),
    selectedScopeId: row.selected_scope_id?.trim() || null,
    selectedUnitIds: parseSelectedUnitIds(row.selected_unit_ids),
    reportMode: normalizeReportMode(row.report_mode ?? "preview"),
  };
}

/**
 * 每日報表／家長信 payload：後台「段考＋單元」優先於 URL 覆寫段考 id。
 */
export function mergeDailyReportPayloadOptionsFromPreferences(
  prefs: ResolvedTeacherReportPreferences,
  urlExamScopeOverride?: string | null,
): BuildDailyOverviewPayloadOptions {
  const exam = prefs.selectedScopeId?.trim() || urlExamScopeOverride?.trim() || undefined;
  const out: BuildDailyOverviewPayloadOptions = {};
  if (exam) out.examScopeId = exam;
  if (prefs.selectedUnitIds.length > 0) out.scopeUnitIds = [...prefs.selectedUnitIds];
  return out;
}

export async function loadTeacherReportPreferences(): Promise<ResolvedTeacherReportPreferences> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("teacher_report_preferences")
      .select("*")
      .eq("report_scope", REPORT_SCOPE_G8_SCIENCE)
      .maybeSingle();
    if (error) {
      console.warn("[teacher_report_preferences]", error.message);
      return resolveTeacherReportPreferences(null);
    }
    return resolveTeacherReportPreferences(data as TeacherReportPreferencesRow | null);
  } catch (e) {
    console.warn("[teacher_report_preferences]", e);
    return resolveTeacherReportPreferences(null);
  }
}

export type PatchTeacherReportPreferencesInput = {
  email_enabled?: boolean;
  send_time?: string;
  enabled_sections?: Partial<Record<TeacherEmailSectionKey, boolean>>;
  parent_summary_enabled?: boolean;
  parent_send_mode?: ParentSendMode;
  parent_enabled_sections?: Partial<Record<ParentEmailSectionKey, boolean>>;
  selected_scope_id?: string | null;
  selected_unit_ids?: string[] | null;
  report_mode?: DailyReportMode;
};

export function applyTeacherSectionPatch(
  current: Record<TeacherEmailSectionKey, boolean>,
  patch?: Partial<Record<TeacherEmailSectionKey, boolean>>,
): Record<TeacherEmailSectionKey, boolean> {
  if (!patch) return { ...current };
  return mergeSections(DEFAULT_TEACHER_SECTIONS, { ...current, ...patch });
}

export function applyParentSectionPatch(
  current: Record<ParentEmailSectionKey, boolean>,
  patch?: Partial<Record<ParentEmailSectionKey, boolean>>,
): Record<ParentEmailSectionKey, boolean> {
  if (!patch) return { ...current };
  return mergeSections(DEFAULT_PARENT_SECTIONS, { ...current, ...patch });
}

export async function patchTeacherReportPreferences(
  patch: PatchTeacherReportPreferencesInput,
): Promise<ResolvedTeacherReportPreferences> {
  const supabase = getSupabaseAdmin();
  const current = await loadTeacherReportPreferences();

  const mergedTeacher = applyTeacherSectionPatch(current.teacherSections, patch.enabled_sections);
  const mergedParent = applyParentSectionPatch(current.parentSections, patch.parent_enabled_sections);

  const nextScopeId =
    patch.selected_scope_id !== undefined ? patch.selected_scope_id?.trim() || null : current.selectedScopeId;
  const nextUnitIds =
    patch.selected_unit_ids !== undefined
      ? (patch.selected_unit_ids ?? []).filter((x) => typeof x === "string" && x.trim())
      : current.selectedUnitIds;
  const nextReportMode = patch.report_mode !== undefined ? patch.report_mode : current.reportMode;

  if (current.rowId) {
    const { data, error } = await supabase
      .from("teacher_report_preferences")
      .update({
        email_enabled: patch.email_enabled ?? current.emailEnabled,
        send_time: patch.send_time ?? current.sendTime,
        enabled_sections: mergedTeacher,
        parent_summary_enabled: patch.parent_summary_enabled ?? current.parentSummaryEnabled,
        parent_send_mode: patch.parent_send_mode ?? current.parentSendMode,
        parent_enabled_sections: mergedParent,
        selected_scope_id: nextScopeId,
        selected_unit_ids: nextUnitIds,
        report_mode: nextReportMode,
      })
      .eq("id", current.rowId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return resolveTeacherReportPreferences(data as TeacherReportPreferencesRow);
  }

  const { data: ins, error: insErr } = await supabase
    .from("teacher_report_preferences")
    .insert({
      teacher_id: null,
      report_scope: REPORT_SCOPE_G8_SCIENCE,
      email_enabled: patch.email_enabled ?? current.emailEnabled,
      send_time: patch.send_time ?? current.sendTime,
      enabled_sections: mergedTeacher,
      parent_summary_enabled: patch.parent_summary_enabled ?? current.parentSummaryEnabled,
      parent_send_mode: patch.parent_send_mode ?? current.parentSendMode,
      parent_enabled_sections: mergedParent,
      selected_scope_id: nextScopeId,
      selected_unit_ids: nextUnitIds,
      report_mode: nextReportMode,
    })
    .select("*")
    .maybeSingle();
  if (insErr) throw new Error(insErr.message);
  return resolveTeacherReportPreferences(ins as TeacherReportPreferencesRow);
}

export function serializePreferencesForApi(resolved: ResolvedTeacherReportPreferences) {
  return {
    reportScope: REPORT_SCOPE_G8_SCIENCE,
    emailEnabled: resolved.emailEnabled,
    sendTime: resolved.sendTime,
    enabledSections: resolved.teacherSections,
    parentSummaryEnabled: resolved.parentSummaryEnabled,
    parentSendMode: resolved.parentSendMode,
    parentEnabledSections: resolved.parentSections,
    selectedScopeId: resolved.selectedScopeId,
    selectedUnitIds: resolved.selectedUnitIds,
    reportMode: resolved.reportMode,
    reportModeLabels: DAILY_REPORT_MODE_LABELS,
    sectionLabels: {
      teacher: TEACHER_SECTION_LABELS,
      parent: PARENT_SECTION_LABELS,
    },
  };
}

export const TEACHER_SECTION_LABELS: Record<TeacherEmailSectionKey, string> = {
  class_avg_completion: "班級整體完成率（平均）",
  today_videos: "今日觀看影片數（全班）",
  today_questions: "今日作答題目數（全班）",
  completed_list: "已完成學生名單",
  incomplete_list: "尚未完成學生名單",
  risk_list: "高風險學生名單",
  top5: "學習表現前 5 名",
  weak_top3: "弱點 TOP3",
  skill_error_breakdown: "Skill 錯誤率分析（延伸表）",
  unwatched_summary: "未觀看影片統計（摘要）",
  incomplete_tasks: "未完成任務學生（學習任務）",
  suggestions: "教學建議",
  admin_link: "後台管理連結",
};

export const PARENT_SECTION_LABELS: Record<ParentEmailSectionKey, string> = {
  completion_rate: "孩子目前完成率",
  class_average: "班級平均",
  today_videos: "今日觀看影片",
  today_questions: "今日作答題數",
  today_accuracy: "今日答對率",
  incomplete_videos_hint: "尚未完成影片（提示）",
  weak_skills: "弱點 skill",
  recommended_video: "推薦影片",
  tonight_tasks: "建議今晚完成任務（推薦影片／技能）",
  teacher_note: "老師提醒文字（手動寄送時填寫）",
  question_updates: "題目更新提醒（題庫升版）",
};
