import Link from "next/link";
import { HomeBackLink } from "@/components/ui/HomeBackLink";

export default function AdminVideoQuizzesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <HomeBackLink />
            <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
            <span className="text-sm font-semibold text-slate-800 sm:text-base lg:text-lg">
              老師｜影片測驗題編輯
            </span>
          </div>
          <nav className="flex flex-wrap gap-x-3 gap-y-2 text-sm sm:gap-4 sm:text-base">
            <Link className="interactive-nav text-teal-700 underline-offset-4 hover:underline" href="/admin">
              後台首頁
            </Link>
            <Link
              className="interactive-nav text-teal-700 underline-offset-4 hover:underline"
              href="/admin/video-quizzes"
            >
              測驗題列表
            </Link>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
