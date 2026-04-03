import { HomeBackLink } from "@/components/ui/HomeBackLink";

export default function AdminReportsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <HomeBackLink />
            <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
            <span className="shrink-0 font-semibold text-slate-800 sm:text-lg">老師｜學習分析總覽</span>
          </div>
          <nav className="flex flex-wrap gap-x-3 gap-y-2 text-sm sm:gap-4 sm:text-base">
            <a className="interactive-nav text-teal-700 underline-offset-4 hover:underline" href="/admin">
              後台首頁
            </a>
            <a
              className="interactive-nav text-teal-700 underline-offset-4 hover:underline"
              href="/admin/students"
            >
              學生名單
            </a>
            <a className="interactive-nav text-teal-700 underline-offset-4 hover:underline" href="/admin/tasks">
              學習任務
            </a>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
