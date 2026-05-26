import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import {
  DEFAULT_PARENT_SECTIONS,
  loadTeacherReportPreferences,
  mergeDailyReportPayloadOptionsFromPreferences,
  type ParentEmailSectionKey,
} from "@/lib/admin/teacher-report-preferences";
import { getStudentWeakSkillSummaries } from "@/lib/report/analysis";
import type { DailyOverviewPayload } from "@/lib/report/buildDailyOverviewPayload";
import { buildDailyOverviewPayload } from "@/lib/report/buildDailyOverviewPayload";
import { resolveStudentAppBaseUrlSafe } from "@/lib/report/reportOrigin";

export type ParentToneMode = "encourage" | "remind" | "risk";

export type ParentDailyEmailReportData = {
  toEmail: string;
  guardianName: string | null;
  subject: string;
  dateLabel: string;
  studentName: string;
  classDisplay: string;
  examScopeTitle: string;
  parentSectionVisibility: Record<ParentEmailSectionKey, boolean>;
  teacherMessage: string | null;
  completionRate: number;
  classAveragePercent: number | null;
  todayWatchedVideos: number;
  todayAnsweredQuestions: number;
  todayAccuracyPercent: number | null;
  incompleteVideosHint: string;
  weakSkillLines: string[];
  weakSkillsInsufficient: boolean;
  recommendedVideoTitle: string;
  recommendedSkillLabel: string;
  studentLoginUrl: string;
  toneMode: ParentToneMode;
};

export type BuildParentDailyEmailReportOptions = {
  /** 指定段考 scope（與 sharedPayload 不同時會重算 payload） */
  examScopeId?: string | null;
  /** 覆寫家長信區塊 */
  parentSectionsOverride?: Partial<Record<ParentEmailSectionKey, boolean>>;
  /** cron 已載入之完整區塊（若提供則不再查 teacher_report_preferences） */
  parentSectionsResolved?: Record<ParentEmailSectionKey, boolean>;
  /** 預覽用：無 parent_email 時仍組出 HTML（不可搭配實際寄送） */
  previewBypassMissingParentEmail?: boolean;
  teacherMessage?: string | null;
};

function parseSort(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

async function fetchScopeVideosOrdered(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  examScopeId: string,
): Promise<{ id: string; title: string }[]> {
  const { data: units } = await supabase
    .from("scope_units")
    .select("id, sort_order")
    .eq("exam_scope_id", examScopeId);
  const sortedUnits = [...(units ?? [])].sort(
    (a, b) =>
      parseSort((a as { sort_order: unknown }).sort_order, 9999) -
      parseSort((b as { sort_order: unknown }).sort_order, 9999),
  );
  const out: { id: string; title: string }[] = [];
  for (const u of sortedUnits) {
    const uid = (u as { id: string }).id;
    const { data: vids } = await supabase.from("videos").select("id, title, sort_order").eq("unit_id", uid);
    const sorted = [...(vids ?? [])].sort(
      (a, b) =>
        parseSort((a as { sort_order: unknown }).sort_order, 9999) -
        parseSort((b as { sort_order: unknown }).sort_order, 9999),
    );
    for (const v of sorted) {
      const row = v as { id: string; title: string };
      out.push({ id: row.id, title: row.title });
    }
  }
  return out;
}

function toneFromCompletion(completionRate: number): ParentToneMode {
  if (completionRate >= 80) return "encourage";
  if (completionRate >= 40) return "remind";
  return "risk";
}

export type BuildParentReportFailure =
  | { ok: false; reason: "NO_STUDENT"; message: string }
  | { ok: false; reason: "INACTIVE"; message: string }
  | { ok: false; reason: "NO_PARENT_EMAIL"; message: string };

export type BuildParentReportSuccess = { ok: true; data: ParentDailyEmailReportData };

/**
 * 家長版：僅單一學生視角。若未傳入 sharedPayload，會自行載入全班 payload（較慢，cron 建議共用一筆）。
 * 不含其他學生姓名、全班排名、後台連結；內容區塊依 parentSectionVisibility。
 */
export async function buildParentDailyEmailReport(
  studentId: string,
  sharedPayload?: DailyOverviewPayload,
  options?: BuildParentDailyEmailReportOptions,
): Promise<BuildParentReportSuccess | BuildParentReportFailure> {
  const supabase = getSupabaseAdmin();
  const { data: raw } = await supabase
    .from("students")
    .select("id, name, class_name, is_active, parent_email, guardian_name")
    .eq("id", studentId)
    .maybeSingle();

  const st = raw as {
    id: string;
    name: string;
    class_name: string | null;
    is_active: boolean;
    parent_email: string | null;
    guardian_name: string | null;
  } | null;

  if (!st) {
    return { ok: false, reason: "NO_STUDENT", message: "找不到此學生。" };
  }
  if (!st.is_active) {
    return { ok: false, reason: "INACTIVE", message: "學生已停用，不寄送家長信。" };
  }
  const toEmail = (st.parent_email ?? "").trim();
  const previewBypass = options?.previewBypassMissingParentEmail === true;
  if (!toEmail && !previewBypass) {
    return {
      ok: false,
      reason: "NO_PARENT_EMAIL",
      message: "此學生尚未設定 parent_email，已跳過家長摘要。",
    };
  }
  const resolvedToEmail = toEmail || "(尚未設定家長信箱)";

  const prefs = await loadTeacherReportPreferences();
  const parentVis: Record<ParentEmailSectionKey, boolean> = {
    ...DEFAULT_PARENT_SECTIONS,
    ...(options?.parentSectionsResolved ?? prefs.parentSections),
    ...(options?.parentSectionsOverride ?? {}),
  };

  let p = sharedPayload ?? null;
  const scopeOverride = options?.examScopeId?.trim();
  if (scopeOverride) {
    if (!p || p.examScopeId !== scopeOverride) {
      const unitIdsForPayload =
        prefs.selectedScopeId &&
        scopeOverride === prefs.selectedScopeId &&
        prefs.selectedUnitIds.length > 0
          ? prefs.selectedUnitIds
          : undefined;
      p = await buildDailyOverviewPayload({ examScopeId: scopeOverride, scopeUnitIds: unitIdsForPayload });
    }
  } else if (!p) {
    p = await buildDailyOverviewPayload(mergeDailyReportPayloadOptionsFromPreferences(prefs, null));
  }

  const mine = p.studentCompletions.find((s) => s.studentId === studentId);
  const completionRate = mine?.overallCompletion ?? 0;
  const incompleteVideosHint =
    p.scopeVideoTotal > 0
      ? (() => {
          const left = Math.max(0, p.scopeVideoTotal - (mine?.completedVideos ?? 0));
          return left > 0
            ? `此段考範圍尚有 ${left} 部預習影片尚未標記為完成，建議依序觀看。`
            : "此段考範圍內的預習影片皆已標記完成，可安排複習與測驗。";
        })()
      : "段考範圍尚未建立影片資料。";

  let classAveragePercent: number | null = null;
  if (st.class_name) {
    const peers = p.studentCompletions.filter((s) => s.className === st.class_name);
    if (peers.length > 0) {
      classAveragePercent =
        Math.round((peers.reduce((a, s) => a + s.overallCompletion, 0) / peers.length) * 10) / 10;
    }
  }

  const today = p.today;
  const start = `${today}T00:00:00+08:00`;
  const end = `${today}T23:59:59+08:00`;

  let todayWatchedVideos = 0;
  try {
    if (p.scopeVideoIds.length > 0) {
      const { data: vpToday } = await supabase
        .from("student_video_progress")
        .select("video_id")
        .eq("student_id", studentId)
        .in("video_id", p.scopeVideoIds)
        .gte("last_viewed_at", start)
        .lte("last_viewed_at", end);
      const set = new Set<string>();
      for (const row of vpToday ?? []) {
        const r = row as { video_id: string };
        if (r.video_id) set.add(r.video_id);
      }
      todayWatchedVideos = set.size;
    }
  } catch {
    todayWatchedVideos = 0;
  }

  let todayAnsweredQuestions = 0;
  let todayCorrect = 0;
  try {
    if (p.scopeQuizIds.length > 0) {
      const { data: attempts } = await supabase
        .from("student_quiz_attempts")
        .select("id")
        .eq("student_id", studentId)
        .in("quiz_id", p.scopeQuizIds)
        .not("submitted_at", "is", null);
      const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
      if (attemptIds.length > 0) {
        const { data: ans } = await supabase
          .from("student_quiz_answers")
          .select("is_correct")
          .in("attempt_id", attemptIds)
          .gte("created_at", start)
          .lte("created_at", end);
        for (const row of ans ?? []) {
          todayAnsweredQuestions += 1;
          if ((row as { is_correct: boolean }).is_correct) todayCorrect += 1;
        }
      }
    }
  } catch {
    todayAnsweredQuestions = 0;
    todayCorrect = 0;
  }

  const todayAccuracyPercent =
    todayAnsweredQuestions > 0
      ? Math.round((todayCorrect / todayAnsweredQuestions) * 1000) / 10
      : null;

  let weakSkillLines: string[] = [];
  try {
    weakSkillLines = await getStudentWeakSkillSummaries(
      supabase,
      p.examScopeId,
      studentId,
      3,
      p.appliedScopeUnitIds.length > 0 ? p.appliedScopeUnitIds : undefined,
    );
  } catch {
    weakSkillLines = [];
  }
  const weakSkillsInsufficient = weakSkillLines.length === 0;

  const orderedVideos = await fetchScopeVideosOrdered(supabase, p.examScopeId);
  let recommendedVideoTitle = "段考範圍內第一部影片";
  let recommendedVideoId: string | null = null;
  if (orderedVideos.length > 0) {
    try {
      const { data: prog } = await supabase
        .from("student_video_progress")
        .select("video_id, is_completed")
        .eq("student_id", studentId)
        .in(
          "video_id",
          orderedVideos.map((v) => v.id),
        );
      const done = new Set(
        (prog ?? [])
          .filter((r: { is_completed: boolean }) => (r as { is_completed: boolean }).is_completed)
          .map((r: { video_id: string }) => (r as { video_id: string }).video_id),
      );
      const next = orderedVideos.find((v) => !done.has(v.id));
      const pick = next ?? orderedVideos[0];
      recommendedVideoTitle = pick.title;
      recommendedVideoId = pick.id;
    } catch {
      recommendedVideoTitle = orderedVideos[0].title;
      recommendedVideoId = orderedVideos[0].id;
    }
  }

  let recommendedSkillLabel = "段考核心概念複習";
  if (recommendedVideoId) {
    const { data: tag } = await supabase
      .from("video_skill_tags")
      .select("skill_name")
      .eq("video_id", recommendedVideoId)
      .limit(1)
      .maybeSingle();
    const sn = (tag as { skill_name: string } | null)?.skill_name?.trim();
    if (sn) recommendedSkillLabel = sn;
  } else if (weakSkillLines[0]) {
    recommendedSkillLabel = weakSkillLines[0].replace(/（錯誤率[^）]+）/, "").trim();
  }

  const base = resolveStudentAppBaseUrlSafe();
  const studentLoginUrl = base ? `${base}/login` : "";

  const classDisplay = st.class_name ? `${st.class_name} 班` : "班級未設定";
  const toneMode = toneFromCompletion(completionRate);

  return {
    ok: true,
    data: {
      toEmail: resolvedToEmail,
      guardianName: st.guardian_name?.trim() || null,
      subject: "名貫補習班｜孩子今日 AI 學習摘要",
      dateLabel: today,
      studentName: st.name,
      classDisplay,
      examScopeTitle: p.examScopeTitle,
      parentSectionVisibility: parentVis,
      teacherMessage: options?.teacherMessage?.trim() || null,
      completionRate,
      classAveragePercent,
      todayWatchedVideos,
      todayAnsweredQuestions,
      todayAccuracyPercent,
      incompleteVideosHint,
      weakSkillLines,
      weakSkillsInsufficient,
      recommendedVideoTitle,
      recommendedSkillLabel,
      studentLoginUrl,
      toneMode,
    },
  };
}
