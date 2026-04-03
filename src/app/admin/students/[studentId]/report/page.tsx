import { ReportChartsLazy } from "@/components/report/ReportChartsLazy";
import { ReportFilters } from "@/components/report/ReportFilters";
import { ReportSharePanel } from "@/components/report/ReportSharePanel";
import { getAdminStudentReportUseCase } from "@/infrastructure/composition";
import { getRepositories } from "@/infrastructure/composition";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getDefaultExamScopeId } from "@/lib/constants";
import { getSupabaseErrorMessage } from "@/lib/supabase-user-message";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ examScopeId?: string; taskId?: string }>;
};

export default async function AdminStudentReportPage({ params, searchParams }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { studentId } = await params;
  const sp = await searchParams;

  const { students, examScopes, learningTasks } = getRepositories();
  const student = await students.findById(studentId);
  if (!student) notFound();

  const scopes = await examScopes.findAllActive();
  const envScope = getDefaultExamScopeId();
  const examScopeId = sp.examScopeId ?? envScope ?? scopes[0]?.id ?? null;

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

  const reportUc = getAdminStudentReportUseCase();
  let report: Awaited<ReturnType<typeof reportUc.execute>> | null = null;
  let loadError: string | null = null;
  try {
    report = await reportUc.execute({
      studentId,
      examScopeId,
      taskId: sp.taskId ?? undefined,
    });
  } catch (e) {
    loadError = getSupabaseErrorMessage(e);
    report = null;
  }

  if (loadError) {
    return (
      <div className="min-h-[100dvh] bg-slate-50">
        <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <h1 className="text-xl font-semibold text-slate-900">學生學習報告</h1>
          </div>
        </header>
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
          <div className="rounded-2xl border border-red-200/90 bg-red-50/90 p-6 text-red-900 shadow-md">
            <p className="font-medium">無法載入學習報告</p>
            <p className="mt-2 text-sm leading-relaxed">
              請稍後再試。若持續發生，請確認資料庫連線與 migration 是否已套用。
            </p>
            <pre className="mt-4 max-h-48 overflow-auto rounded-lg bg-white/80 p-3 text-xs whitespace-pre-wrap">
              {loadError}
            </pre>
            <Link
              href="/admin/tasks"
              className="mt-4 inline-block text-sm font-medium text-teal-800 underline"
            >
              返回學習任務設定
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    notFound();
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/admin/tasks"
              className="interactive-nav text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
            >
              ← 返回學習任務設定
            </Link>
            <h1 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">學生學習報告</h1>
            <p className="mt-1 text-sm text-slate-600">
              以下為本次學習任務的完成情況與學習表現分析
            </p>
            <p className="mt-2 text-sm text-slate-700">
              {student.name}{" "}
              <span className="font-mono text-slate-500">（{student.studentCode}）</span>
              {student.className ? ` · ${student.className} 班` : ""}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl bg-slate-200/80" />}>
          <ReportFilters
            studentId={studentId}
            examScopes={scopes.map((s) => ({ id: s.id, title: s.title }))}
            tasks={tasksForClass.map((t) => ({
              id: t.id,
              title: t.title,
              startDate: t.start_date,
            }))}
            currentExamScopeId={examScopeId}
            currentTaskId={sp.taskId ?? null}
          />
        </Suspense>

        <ReportSharePanel studentId={studentId} taskId={sp.taskId ?? null} />

        {report.examScope ? (
          <p className="text-sm text-slate-600">
            完成情況範圍：<span className="font-medium text-slate-800">{report.examScope.title}</span>
          </p>
        ) : (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
            尚未設定段考範圍時，部分統計可能為空。仍可檢視任務與測驗相關資料。
          </p>
        )}

        <ReportChartsLazy report={report} />
      </div>
    </div>
  );
}
