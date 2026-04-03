import Link from "next/link";
import { redirect } from "next/navigation";
import { HomeBackLink } from "@/components/ui/HomeBackLink";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <HomeBackLink />
            <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
            <span className="font-semibold text-slate-800 sm:text-lg">老師後台</span>
          </div>
          <span className="text-xs text-slate-500 sm:text-sm">選擇要管理的項目</span>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">歡迎使用</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          請從下方進入常用功能；學習進度與任務設定分屬不同頁面。
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <li>
            <Link
              href="/admin/students"
              className="interactive-btn block min-h-[120px] rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6"
            >
              <span className="font-medium text-slate-900">學生名單管理</span>
              <p className="mt-2 text-sm text-slate-600">新增／匯入學生、重設密碼與匯出名單</p>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/video-tracking"
              className="interactive-btn block min-h-[120px] rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6"
            >
              <span className="font-medium text-slate-900">學習進度追蹤</span>
              <p className="mt-2 text-sm text-slate-600">查看全班學生影片與測驗整體狀況</p>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/tasks"
              className="interactive-btn block min-h-[120px] rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6"
            >
              <span className="font-medium text-slate-900">學習任務設定</span>
              <p className="mt-2 text-sm text-slate-600">建立任務、指派班級與影片，並追蹤完成進度</p>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/reports"
              className="interactive-btn block min-h-[120px] rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6"
            >
              <span className="font-medium text-slate-900">學習分析總覽</span>
              <p className="mt-2 text-sm text-slate-600">捷徑進入圖表分析與學生學習報告</p>
            </Link>
          </li>
        </ul>
        <p className="mt-8 text-center text-xs text-slate-500">
          登入網址：<span className="font-mono">/admin/login</span>
        </p>
      </div>
    </div>
  );
}
