import { TaskCreateForm } from "@/app/admin/tasks/TaskCreateForm";
import { getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminTaskNewPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { examScopes } = getRepositories();
  const scopes = await examScopes.findAllActive();
  const examScopeOptions = scopes.map((s) => ({ id: s.id, label: s.title }));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/tasks"
          className="interactive-nav text-sm font-medium text-cyan-700 underline-offset-4 hover:underline"
        >
          ← 返回任務列表
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">建立學習任務</h1>
        <p className="mt-2 text-sm text-slate-400">
          請先選擇段考範圍，再勾選單元影片；建立後系統將依觀看進度自動更新任務完成狀態。
        </p>
      </div>
      <TaskCreateForm examScopeOptions={examScopeOptions} />
    </div>
  );
}
