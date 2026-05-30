import { TaskCreateForm } from "@/app/admin/tasks/TaskCreateForm";
import { getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ taskId: string }> };

export default async function AdminTaskEditPage({ params }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { taskId } = await params;
  const { learningTasks, examScopes } = getRepositories();
  const task = await learningTasks.findById(taskId);
  if (!task) notFound();

  const scopes = await examScopes.findAllActive();
  const examScopeOptions = scopes.map((s) => ({ id: s.id, label: s.title }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/tasks/${taskId}`}
          className="interactive-nav text-sm font-medium text-cyan-700 underline-offset-4 hover:underline"
        >
          ← 返回任務詳情
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">編輯學習任務</h1>
        <p className="mt-2 text-sm text-slate-400">{task.title}</p>
      </div>
      <TaskCreateForm examScopeOptions={examScopeOptions} editTaskId={taskId} />
    </div>
  );
}
