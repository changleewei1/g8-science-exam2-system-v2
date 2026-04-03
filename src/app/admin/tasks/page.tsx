import { LearningTasksDbMissing } from "@/components/admin/LearningTasksDbMissing";
import { TasksListClient } from "@/components/admin/TasksListClient";
import { getListLearningTasksUseCase } from "@/infrastructure/composition";
import {
  getSupabaseErrorMessage,
  looksLikeMissingLearningTasksTable,
} from "@/lib/supabase-user-message";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const listUc = getListLearningTasksUseCase();

  let tasks: Awaited<ReturnType<typeof listUc.execute>> = [];
  let loadError: string | null = null;

  try {
    tasks = await listUc.execute();
  } catch (e) {
    loadError = getSupabaseErrorMessage(e);
  }

  if (loadError) {
    const missingTable = looksLikeMissingLearningTasksTable(loadError);
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">學習任務設定</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            設定學生需完成的影片學習任務，系統將自動追蹤觀看進度與學習表現
          </p>
        </div>
        {missingTable ? (
          <LearningTasksDbMissing technicalDetail={loadError} />
        ) : (
          <div className="rounded-2xl border border-red-200/90 bg-red-50/90 p-6 text-red-900 shadow-md">
            <p className="font-medium">無法載入學習任務</p>
            <p className="mt-2 text-sm leading-relaxed">
              請稍後再試，或確認網路連線與帳號權限。若問題持續，請聯絡系統管理員。
            </p>
            <details className="mt-4 rounded-lg border border-red-200/60 bg-white/60 p-3 text-xs">
              <summary className="cursor-pointer font-medium">錯誤詳情（選讀）</summary>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{loadError}</pre>
            </details>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">學習任務設定</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            設定學生需完成的影片學習任務，系統將自動追蹤觀看進度與學習表現
          </p>
        </div>
        <Link
          href="/admin/tasks/new"
          className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-md"
        >
          建立學習任務
        </Link>
      </div>

      <section id="task-list" className="scroll-mt-8">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">已建立的學習任務</h2>
        <TasksListClient tasks={tasks} />
      </section>
    </div>
  );
}
