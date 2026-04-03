import Link from "next/link";
import { getAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LearningSetupHelpPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/admin/tasks"
          className="interactive-nav text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
        >
          ← 返回學習任務設定
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">系統初始化說明</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          首次使用學習任務功能前，需由管理員在資料庫環境完成一次性設定。完成後即可建立任務、追蹤學生進度。
        </p>
      </div>

      <ol className="list-decimal space-y-4 rounded-2xl border border-slate-200 bg-white p-6 pl-10 text-sm leading-relaxed text-slate-700 shadow-sm">
        <li>
          登入您的<strong>資料庫管理後台</strong>（例如 Supabase 專案後台）。
        </li>
        <li>
          在 SQL 執行區域，依序套用專案提供的資料庫結構更新檔（migration），確保包含「學習任務」相關資料表與必要函式。
        </li>
        <li>
          執行完成後，回到本系統<strong>重新整理頁面</strong>。若仍無法建立任務，請確認目前連線的資料庫專案是否正確。
        </li>
      </ol>

      <details className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600 shadow-sm">
        <summary className="cursor-pointer select-none font-medium text-slate-800">
          技術人員參考（選讀）
        </summary>
        <p className="mt-3 text-xs leading-relaxed">
          需存在 learning_tasks 等資料表；若 initial migration 中的共用函式尚未建立，請一併套用。詳細檔名與路徑請見專案{" "}
          <code className="rounded bg-white px-1 py-0.5 text-[11px]">supabase/migrations/</code> 目錄。
        </p>
      </details>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm"
        >
          返回後台首頁
        </Link>
        <Link
          href="/admin/tasks"
          className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-md"
        >
          前往學習任務設定
        </Link>
      </div>
    </div>
  );
}
