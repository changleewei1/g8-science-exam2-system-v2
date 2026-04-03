import { TaskProgressClient } from "@/components/admin/TaskProgressClient";
import { getAdminTaskProgressDetailUseCase } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ taskId: string }> };

export default async function AdminTaskProgressPage({ params }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { taskId } = await params;
  const uc = getAdminTaskProgressDetailUseCase();
  const detail = await uc.execute(taskId);
  if (!detail) notFound();

  const { task } = detail;
  const sum = detail.students.reduce((a, s) => a + s.completionRate, 0);
  const overall =
    detail.students.length > 0 ? Math.round((sum / detail.students.length) * 10) / 10 : 0;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/tasks"
          className="interactive-nav text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
        >
          ← 返回學習任務設定
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">學習進度追蹤</h1>
        <p className="mt-2 text-sm text-slate-600">
          顯示學生影片觀看完成情況（達 90% 視為完成）
        </p>
        <p className="mt-2 text-lg font-medium text-slate-800">{task.title}</p>
        <p className="text-sm text-slate-600">
          {task.assignmentMode === "students"
            ? `指派：已選 ${task.assigneeStudentIds.length} 位學生`
            : `${task.className} 班`}{" "}
          ｜{task.startDate} — {task.endDate}
          {!task.isActive ? (
            <span className="ml-2 rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">未啟用</span>
          ) : null}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          整體完成率（全班平均）：<span className="font-semibold text-slate-900">{overall}%</span>
        </p>
      </div>

      <TaskProgressClient taskId={taskId} detail={detail} />
    </div>
  );
}
