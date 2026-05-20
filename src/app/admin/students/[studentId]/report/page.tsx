import { AdminInlineNavLink, AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { ReportChartsLazy } from "@/components/report/ReportChartsLazy";
import { ReportFilters } from "@/components/report/ReportFilters";
import { ReportSharePanel } from "@/components/report/ReportSharePanel";
import { getAdminStudentReportUseCase } from "@/infrastructure/composition";
import { getRepositories } from "@/infrastructure/composition";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getDefaultExamScopeId } from "@/lib/constants";
import { filterTasksByExamScope } from "@/lib/admin/report-exam-scope-tasks";
import {
  DEFAULT_STUDENT_REPORT_SCOPE,
  domainExamScopeToReport,
  reportScopeToFilter,
  resolveExamScopeFromReportFilter,
  formatReportScopeLabel,
  type ReportExamScope,
} from "@/lib/admin/student-report-scope";
import { getSupabaseErrorMessage } from "@/lib/supabase-user-message";
import { getAdminSession } from "@/lib/session";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{
    examScopeId?: string;
    taskId?: string;
    grade?: string;
    subject?: string;
    semester?: string;
    exam?: string;
  }>;
};

function resolveFilterAndScopeId(
  reportScopes: ReportExamScope[],
  sp: {
    examScopeId?: string;
    grade?: string;
    subject?: string;
    semester?: string;
    exam?: string;
  },
  envScopeId: string | undefined,
) {

  if (sp.grade && sp.subject && sp.semester && sp.exam) {
    const filter = {
      grade: sp.grade,
      subject: sp.subject,
      semester: sp.semester,
      exam: sp.exam,
    };
    const resolved = resolveExamScopeFromReportFilter(reportScopes, filter);
    return { filter, examScopeId: resolved?.id ?? null, resolved };
  }

  if (sp.examScopeId) {
    const found = reportScopes.find((s) => s.id === sp.examScopeId);
    if (found) {
      const filter = reportScopeToFilter(found);
      return { filter, examScopeId: found.id, resolved: found };
    }
  }

  if (envScopeId) {
    const found = reportScopes.find((s) => s.id === envScopeId);
    if (found) {
      const filter = reportScopeToFilter(found);
      return { filter, examScopeId: found.id, resolved: found };
    }
  }

  const filter = DEFAULT_STUDENT_REPORT_SCOPE;
  const resolved = resolveExamScopeFromReportFilter(reportScopes, filter);
  return { filter, examScopeId: resolved?.id ?? null, resolved };
}

export default async function AdminStudentReportPage({ params, searchParams }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { studentId } = await params;
  const sp = await searchParams;

  const { students, examScopes, learningTasks } = getRepositories();
  const student = await students.findById(studentId);
  if (!student) notFound();

  const scopes = await examScopes.findAllActive();
  const reportScopes = scopes.map((s) => domainExamScopeToReport(s));
  const envScope = getDefaultExamScopeId();

  const { filter, examScopeId, resolved } = resolveFilterAndScopeId(reportScopes, sp, envScope);

  const allTasks = await learningTasks.findAll();
  let tasksForClass = allTasks.filter((t) => t.class_name === student.className);
  try {
    const supabase = getSupabaseAdmin();
    const { data: asg } = await supabase
      .from("learning_task_assignees")
      .select("task_id")
      .eq("student_id", studentId);
    const aid = new Set((asg ?? []).map((x: { task_id: string }) => x.task_id));
    if (aid.size > 0) {
      tasksForClass = allTasks.filter(
        (t) => t.class_name === student.className || aid.has(t.id),
      );
    }
  } catch {
    /* 未套用 assignees migration 時略過 */
  }

  const taskOptions = await filterTasksByExamScope(
    tasksForClass.map((t) => ({
      id: t.id,
      title: t.title,
      startDate: t.start_date,
    })),
    examScopeId,
  );

  let taskId = sp.taskId ?? null;
  if (taskId && !taskOptions.some((t) => t.id === taskId)) {
    taskId = null;
  }

  const reportUc = getAdminStudentReportUseCase();
  let report: Awaited<ReturnType<typeof reportUc.execute>> | null = null;
  let loadError: string | null = null;
  try {
    report = await reportUc.execute({
      studentId,
      examScopeId: examScopeId ?? undefined,
      taskId: taskId ?? undefined,
    });
  } catch (e) {
    loadError = getSupabaseErrorMessage(e);
    report = null;
  }

  if (loadError) {
    return (
      <>
        <AdminStandaloneHeader title="學生學習報告" narrow />
        <AdminStandaloneMain narrow>
          <div className="rounded-2xl border border-rose-500/35 bg-rose-950/45 p-6 text-rose-50 shadow-md">
            <p className="font-medium">無法載入學習報告</p>
            <p className="mt-2 text-sm leading-relaxed text-rose-100/90">
              請稍後再試。若持續發生，請確認資料庫連線與 migration 是否已套用。
            </p>
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-black/30 p-3 text-xs whitespace-pre-wrap text-rose-50/90">
              {loadError}
            </pre>
            <AdminInlineNavLink href="/admin/tasks">返回學習任務設定</AdminInlineNavLink>
          </div>
        </AdminStandaloneMain>
      </>
    );
  }

  if (!report) {
    notFound();
  }

  return (
    <>
      <AdminStandaloneHeader
        title="學生學習報告"
        narrow
        right={<AdminInlineNavLink href="/admin/tasks">返回學習任務設定</AdminInlineNavLink>}
      />
      <AdminStandaloneMain narrow>
        <div className="mb-6 space-y-2">
          <p className="text-sm text-slate-400">以下為本次學習任務的完成情況與學習表現分析</p>
          <p className="text-sm text-slate-300">
            {student.name}{" "}
            <span className="font-mono text-slate-500">（{student.studentCode}）</span>
            {student.className ? ` · ${student.className} 班` : ""}
          </p>
        </div>

        <Suspense fallback={<div className="h-28 animate-pulse rounded-2xl bg-white/10" />}>
          <ReportFilters
            studentId={studentId}
            examScopes={reportScopes}
            tasks={taskOptions}
            currentFilter={filter}
            currentTaskId={taskId}
          />
        </Suspense>

        <ReportSharePanel studentId={studentId} taskId={taskId} />

        {resolved ? (
          <p className="text-sm text-slate-400">
            完成情況範圍：
            <span className="font-medium text-slate-200">{formatReportScopeLabel(filter)}</span>
            {report.examScope?.title ? (
              <span className="text-slate-500">（{report.examScope.title}）</span>
            ) : null}
          </p>
        ) : (
          <p className="rounded-xl border border-amber-400/35 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
            目前尚未建立此學習範圍資料，部分統計可能為空。仍可檢視任務與測驗相關資料。
          </p>
        )}

        <ReportChartsLazy report={report} />
      </AdminStandaloneMain>
    </>
  );
}
