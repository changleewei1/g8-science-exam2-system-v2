import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import {
  DAILY_REPORT_MODE_LABELS,
  intersectSectionsWithReportMode,
  loadTeacherReportPreferences,
  mergeDailyReportPayloadOptionsFromPreferences,
  type DailyReportMode,
  type ResolvedTeacherReportPreferences,
  type TeacherEmailSectionKey,
} from "@/lib/admin/teacher-report-preferences";
import {
  countWrongAnswersInScopeQuizzes,
  getWeakSkillsDetailed,
} from "@/lib/report/analysis";
import type { BuildDailyOverviewPayloadOptions } from "@/lib/report/buildDailyOverviewPayload";
import { buildDailyOverviewPayload } from "@/lib/report/buildDailyOverviewPayload";
import { buildTaskTrackingReport } from "@/lib/report/buildTaskTrackingReport";
import { getAdminSkillPracticeOverview, skillAggregateStatus } from "@/lib/skill-practice-summary";

export type TeacherDailyEmailWeakRow = {
  skillName: string;
  wrongRatePercent: number;
  affectedStudentCount: number;
};

export type TeacherDailyEmailReportData = {
  dateLabel: string;
  mailTitle: string;
  examScopeId: string;
  examScopeTitle: string;
  scopeUnitTitles: string[];
  reportMode: DailyReportMode;
  reportModeLabel: string;
  sectionVisibility: Record<TeacherEmailSectionKey, boolean>;
  /** 班級平均「影片測驗完成率」（預習模式重點） */
  classQuizAveragePercent: number;
  classVideoCompletionRate: number;
  completedStudentCount: number;
  incompleteStudentCount: number;
  atRiskStudentCount: number;
  completedStudents: { name: string; className: string | null }[];
  incompleteStudents: { name: string; className: string | null; completionRate: number }[];
  atRiskStudents: { name: string; className: string | null; completionRate: number }[];
  topStudents: { name: string; className: string | null; completionRate: number }[];
  weakSkillsTop3: TeacherDailyEmailWeakRow[];
  skillBreakdownRows: TeacherDailyEmailWeakRow[];
  unwatchedLines: string[];
  incompleteTaskLines: string[];
  todayViewedVideoCount: number;
  todayAnsweredQuestionCount: number;
  suggestions: string[];
  adminUrl: string;
  warnings: string[];
  taskTrackingAppendixHtml: string;
  hasRecentTasks: boolean;
  taskCount: number;
  /** 練習模式：技能樹／智慧練習摘要行 */
  skillPracticeLines: string[];
  /** 複習模式：歷史錯題與弱點補強摘要行 */
  reviewHighlightLines: string[];
  /** 納入統計之 active 學生數 */
  activeStudentCount: number;
  /** 題目品質警示（僅老師信，不進家長版） */
  questionQualityTodayFeedback: number;
  questionQualityNeedsReview: number;
  questionQualityAutoHiddenToday: number;
  questionQualityLowAiConfidence: number;
};

export async function buildTeacherDailyEmailReport(
  payloadOptions?: BuildDailyOverviewPayloadOptions,
  prefsOverride?: ResolvedTeacherReportPreferences | null,
): Promise<TeacherDailyEmailReportData> {
  const prefs = prefsOverride ?? (await loadTeacherReportPreferences());
  const mergedOpts = mergeDailyReportPayloadOptionsFromPreferences(
    prefs,
    payloadOptions?.examScopeId ?? null,
  );
  const finalPayloadOpts: BuildDailyOverviewPayloadOptions = {
    ...mergedOpts,
    scopeUnitIds: mergedOpts.scopeUnitIds ?? payloadOptions?.scopeUnitIds ?? undefined,
  };
  const visBase = intersectSectionsWithReportMode(prefs.reportMode, prefs.teacherSections);

  const p = await buildDailyOverviewPayload(finalPayloadOpts);
  const supabase = getSupabaseAdmin();
  const unitFilter =
    p.appliedScopeUnitIds.length > 0 ? p.appliedScopeUnitIds : undefined;

  let weakSkillsTop3: TeacherDailyEmailWeakRow[] = [];
  let skillBreakdownRows: TeacherDailyEmailWeakRow[] = [];
  try {
    if (visBase.weak_top3 || visBase.skill_error_breakdown) {
      const limit = visBase.skill_error_breakdown ? 12 : 3;
      const detailed = await getWeakSkillsDetailed(supabase, p.examScopeId, limit, unitFilter);
      const mapped = detailed.map((w) => ({
        skillName: w.skillName,
        wrongRatePercent: Math.round(w.wrongRate * 1000) / 10,
        affectedStudentCount: w.affectedStudentCount,
      }));
      weakSkillsTop3 = mapped.slice(0, 3);
      skillBreakdownRows = visBase.skill_error_breakdown ? mapped : [];
    }
  } catch {
    weakSkillsTop3 = [];
    skillBreakdownRows = [];
  }

  const unwatchedLines: string[] = [];
  if (visBase.unwatched_summary && p.scopeVideoTotal > 0) {
    const rows = [...p.studentCompletions]
      .map((s) => ({
        name: s.studentName,
        cls: s.className,
        left: p.scopeVideoTotal - s.completedVideos,
      }))
      .filter((x) => x.left > 0)
      .sort((a, b) => b.left - a.left)
      .slice(0, 18);
    for (const r of rows) {
      unwatchedLines.push(`${r.name}（${r.cls ?? "未分班"}）：尚有 ${r.left} 部影片未完成`);
    }
  }

  let taskTrackingAppendixHtml = "";
  let hasRecentTasks = false;
  let taskCount = 0;
  const taskWarnings: string[] = [];
  const incompleteTaskLines: string[] = [];

  try {
    const task = await buildTaskTrackingReport();
    hasRecentTasks = task.hasRecentTasks;
    taskCount = task.tasks.length;
    if (visBase.incomplete_tasks) {
      taskTrackingAppendixHtml = task.hasRecentTasks && task.html ? task.html : "";
      const seen = new Set<string>();
      for (const t of task.tasks) {
        for (const s of t.incompleteStudents) {
          if (!seen.has(s.studentId)) {
            seen.add(s.studentId);
            incompleteTaskLines.push(`${s.name}（${t.title}）`);
          }
        }
      }
    }
    taskWarnings.push(...task.warnings);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    taskWarnings.push(`任務追蹤產生失敗：${msg}`);
  }

  const classQuizAveragePercent =
    p.studentCompletions.length === 0
      ? 0
      : Math.round(
          (p.studentCompletions.reduce((a, s) => a + s.quizCompletionRate, 0) / p.studentCompletions.length) * 10,
        ) / 10;

  const skillPracticeLines: string[] = [];
  if (prefs.reportMode === "practice") {
    try {
      const unitArg =
        prefs.selectedUnitIds.length > 0 ? prefs.selectedUnitIds : p.appliedScopeUnitIds.length > 0
          ? p.appliedScopeUnitIds
          : null;
      const ov = await getAdminSkillPracticeOverview(p.examScopeId, {
        unitIds: unitArg && unitArg.length > 0 ? unitArg : null,
      });
      if (ov?.by_skill?.length) {
        for (const row of ov.by_skill.slice(0, 10)) {
          const st = skillAggregateStatus(row);
          const acc =
            row.avg_accuracy != null
              ? `，智慧練習作答正確率約 ${(row.avg_accuracy * 100).toFixed(0)}%`
              : "";
          skillPracticeLines.push(
            `${row.skill_name}：全班平均熟練 ${Math.round(row.avg_mastery * 10) / 10}%（${st}）${acc}`,
          );
        }
      } else {
        skillPracticeLines.push("目前智慧練習資料不足，或尚未有學生於此範圍練習。");
      }
    } catch {
      skillPracticeLines.push("無法載入技能樹練習摘要（請稍後再試）。");
    }
  }

  const reviewHighlightLines: string[] = [];
  if (prefs.reportMode === "review") {
    try {
      const wrongN = await countWrongAnswersInScopeQuizzes(supabase, p.scopeQuizIds);
      reviewHighlightLines.push(`段考範圍內累計答錯題次數：${wrongN} 次（歷史累計，供複習優先參考）。`);
      if (p.weakSkills.length > 0) {
        reviewHighlightLines.push(
          `過去弱點主題：${p.weakSkills.map((w) => `${w.skill}（錯誤率 ${(w.wrongRate * 100).toFixed(0)}%）`).join("；")}`,
        );
      }
      reviewHighlightLines.push(
        "AI 補強建議：請優先安排「弱點技能」對應的影片複習與題組再測；已完成者可進行變化題練習。",
      );
    } catch {
      reviewHighlightLines.push("複習模式摘要載入時發生錯誤。");
    }
  }

  let questionQualityTodayFeedback = 0;
  let questionQualityNeedsReview = 0;
  let questionQualityAutoHiddenToday = 0;
  let questionQualityLowAiConfidence = 0;
  try {
    const ymd = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const sinceIso = `${ymd}T00:00:00+08:00`;
    const { count: c1 } = await supabase
      .from("question_feedback")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sinceIso);
    questionQualityTodayFeedback = c1 ?? 0;

    const { count: c2 } = await supabase
      .from("question_quality_stats")
      .select("*", { count: "exact", head: true })
      .eq("review_status", "needs_review");
    questionQualityNeedsReview = c2 ?? 0;

    const { count: c3 } = await supabase
      .from("question_quality_stats")
      .select("*", { count: "exact", head: true })
      .eq("review_status", "hidden")
      .lt("quality_score", 50)
      .gte("updated_at", sinceIso);
    questionQualityAutoHiddenToday = c3 ?? 0;

    const { count: c4 } = await supabase
      .from("question_quality_stats")
      .select("*", { count: "exact", head: true })
      .lt("ai_confidence_score", 70);
    questionQualityLowAiConfidence = c4 ?? 0;
  } catch {
    questionQualityTodayFeedback = 0;
    questionQualityNeedsReview = 0;
    questionQualityAutoHiddenToday = 0;
    questionQualityLowAiConfidence = 0;
  }

  const modeLabel = DAILY_REPORT_MODE_LABELS[prefs.reportMode];

  const mailTitle = `${p.title}｜${modeLabel}`;

  return {
    dateLabel: p.today,
    mailTitle,
    examScopeId: p.examScopeId,
    examScopeTitle: p.examScopeTitle,
    scopeUnitTitles: p.scopeUnitTitles,
    reportMode: prefs.reportMode,
    reportModeLabel: modeLabel,
    sectionVisibility: visBase,
    classQuizAveragePercent,
    classVideoCompletionRate: p.classVideoCompletionRate,
    completedStudentCount: p.completedStudentCount,
    incompleteStudentCount: p.incompleteStudentCount,
    atRiskStudentCount: p.atRiskStudentCount,
    completedStudents: p.completedStudents.map((s) => ({
      name: s.studentName,
      className: s.className,
    })),
    incompleteStudents: p.incompleteStudents.map((s) => ({
      name: s.studentName,
      className: s.className,
      completionRate: s.overallCompletion,
    })),
    atRiskStudents: p.riskStudents.map((s) => ({
      name: s.studentName,
      className: s.className,
      completionRate: s.completionRate,
    })),
    topStudents: p.topStudents,
    weakSkillsTop3,
    skillBreakdownRows,
    unwatchedLines,
    incompleteTaskLines,
    todayViewedVideoCount: p.todayViewedVideoCount,
    todayAnsweredQuestionCount: p.todayAnsweredQuestionCount,
    suggestions: p.suggestions,
    adminUrl: p.adminLink,
    warnings: [...p.warnings, ...taskWarnings],
    taskTrackingAppendixHtml,
    hasRecentTasks,
    taskCount,
    skillPracticeLines,
    reviewHighlightLines,
    activeStudentCount: p.activeStudents.length,
    questionQualityTodayFeedback,
    questionQualityNeedsReview,
    questionQualityAutoHiddenToday,
    questionQualityLowAiConfidence,
  };
}
