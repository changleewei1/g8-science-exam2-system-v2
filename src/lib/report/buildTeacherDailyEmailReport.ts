import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getWeakSkillsDetailed } from "@/lib/report/analysis";
import { buildDailyOverviewPayload } from "@/lib/report/buildDailyOverviewPayload";
import { buildTaskTrackingReport } from "@/lib/report/buildTaskTrackingReport";

export type TeacherDailyEmailWeakRow = {
  skillName: string;
  wrongRatePercent: number;
  affectedStudentCount: number;
};

export type TeacherDailyEmailReportData = {
  dateLabel: string;
  mailTitle: string;
  examScopeTitle: string;
  classVideoCompletionRate: number;
  completedStudentCount: number;
  incompleteStudentCount: number;
  atRiskStudentCount: number;
  completedStudents: { name: string; className: string | null }[];
  incompleteStudents: { name: string; className: string | null; completionRate: number }[];
  atRiskStudents: { name: string; className: string | null; completionRate: number }[];
  weakSkillsTop3: TeacherDailyEmailWeakRow[];
  todayViewedVideoCount: number;
  todayAnsweredQuestionCount: number;
  suggestions: string[];
  adminUrl: string;
  warnings: string[];
  taskTrackingAppendixHtml: string;
  hasRecentTasks: boolean;
  taskCount: number;
};

export async function buildTeacherDailyEmailReport(): Promise<TeacherDailyEmailReportData> {
  const p = await buildDailyOverviewPayload();
  const supabase = getSupabaseAdmin();

  let weakSkillsTop3: TeacherDailyEmailWeakRow[] = [];
  try {
    const detailed = await getWeakSkillsDetailed(supabase, p.examScopeId, 3);
    weakSkillsTop3 = detailed.map((w) => ({
      skillName: w.skillName,
      wrongRatePercent: Math.round(w.wrongRate * 1000) / 10,
      affectedStudentCount: w.affectedStudentCount,
    }));
  } catch {
    weakSkillsTop3 = [];
  }

  let taskTrackingAppendixHtml = "";
  let hasRecentTasks = false;
  let taskCount = 0;
  const taskWarnings: string[] = [];
  try {
    const task = await buildTaskTrackingReport();
    hasRecentTasks = task.hasRecentTasks;
    taskCount = task.tasks.length;
    taskTrackingAppendixHtml = task.hasRecentTasks && task.html ? task.html : "";
    taskWarnings.push(...task.warnings);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    taskWarnings.push(`任務追蹤產生失敗：${msg}`);
  }

  const mailTitle = "【國二理化】每日學習分析總覽";

  return {
    dateLabel: p.today,
    mailTitle,
    examScopeTitle: p.examScopeTitle,
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
    weakSkillsTop3,
    todayViewedVideoCount: p.todayViewedVideoCount,
    todayAnsweredQuestionCount: p.todayAnsweredQuestionCount,
    suggestions: p.suggestions,
    adminUrl: p.adminLink,
    warnings: [...p.warnings, ...taskWarnings],
    taskTrackingAppendixHtml,
    hasRecentTasks,
    taskCount,
  };
}
