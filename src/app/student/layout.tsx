import Link from "next/link";
import { HomeBackLink } from "@/components/ui/HomeBackLink";

export const dynamic = "force-dynamic";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-sm sm:px-6">
        <nav className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 py-2 text-sm sm:gap-4 sm:text-base">
          <HomeBackLink />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:gap-x-8">
            <Link
              href="/student/dashboard"
              className="interactive-nav flex min-h-11 items-center font-medium text-teal-800 underline-offset-4 hover:underline"
            >
              學習總覽
            </Link>
            <Link
              href="/student/tasks"
              className="interactive-nav flex min-h-11 items-center text-slate-600 underline-offset-4 hover:text-teal-700 hover:underline"
            >
              學習任務
            </Link>
          </div>
        </nav>
      </header>
      {children}
    </div>
  );
}
