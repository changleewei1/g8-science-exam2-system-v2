"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

function IconHome({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function navLinkClass(active: boolean) {
  return [
    "interactive-nav relative flex min-h-11 items-center px-1 text-sm font-semibold transition sm:text-base",
    active
      ? "text-cyan-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-cyan-500"
      : "text-slate-600 hover:text-cyan-800",
  ].join(" ");
}

export function StudentTopNav() {
  const pathname = usePathname() ?? "";
  const [loggingOut, setLoggingOut] = useState(false);
  const [taskSummary, setTaskSummary] = useState<{
    incompleteTaskCount: number;
    unreadQuestionUpdateCount: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/student/tasks/summary", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;
        const n = Number(data.incompleteTaskCount);
        const qu = Number(data.unreadQuestionUpdateCount);
        setTaskSummary({
          incompleteTaskCount: Number.isFinite(n) ? n : 0,
          unreadQuestionUpdateCount: Number.isFinite(qu) ? qu : 0,
        });
      } catch {
        if (!cancelled) setTaskSummary({ incompleteTaskCount: 0, unreadQuestionUpdateCount: 0 });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const incompleteTaskCount = taskSummary?.incompleteTaskCount ?? null;
  const unreadQuestionUpdateCount = taskSummary?.unreadQuestionUpdateCount ?? null;

  const onLogout = useCallback(async () => {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error("logout failed");
      window.location.assign("/login");
    } catch {
      setLoggingOut(false);
      window.alert("登出失敗，請稍後再試。");
    }
  }, []);

  const isOverview =
    pathname === "/student/dashboard" ||
    pathname.startsWith("/student/exam-scope/") ||
    pathname.startsWith("/student/unit/") ||
    pathname.startsWith("/student/video/") ||
    pathname.startsWith("/student/lab") ||
    pathname.startsWith("/student/quiz");

  const isTasks = pathname.startsWith("/student/tasks");

  return (
    <header className="sticky top-0 z-30 border-b border-cyan-200/40 bg-white/80 px-4 pt-[env(safe-area-inset-top)] shadow-[0_4px_24px_-12px_rgba(14,165,233,0.15)] backdrop-blur-xl sm:px-6">
      <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 py-2.5 text-sm sm:gap-4 sm:text-base">
        <Link
          href="/student/dashboard"
          className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/90 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] sm:px-4 sm:text-base"
        >
          <IconHome className="h-5 w-5 shrink-0 text-cyan-600" />
          學習首頁
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:gap-x-8">
          <Link href="/student/dashboard" className={navLinkClass(isOverview && !isTasks)}>
            學習總覽
          </Link>
          <Link
            href="/student/tasks"
            className={cn(navLinkClass(isTasks), "inline-flex items-center gap-2")}
            aria-describedby={
              (incompleteTaskCount !== null && incompleteTaskCount > 0) ||
              (unreadQuestionUpdateCount !== null && unreadQuestionUpdateCount > 0)
                ? "nav-tasks-incomplete-hint"
                : undefined
            }
          >
            學習任務
            <span className="flex flex-wrap items-center gap-1.5">
              {incompleteTaskCount !== null && incompleteTaskCount > 0 ? (
                <span
                  className="inline-flex min-h-[1.25rem] shrink-0 items-center justify-center rounded-full bg-[#FF3B30] px-1.5 text-[10px] font-bold leading-none text-white shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_2px_8px_rgba(255,59,48,0.45)] tabular-nums sm:min-h-[1.35rem] sm:text-[11px]"
                  title={`尚有 ${incompleteTaskCount} 個任務未完成`}
                  aria-hidden
                >
                  任務 {incompleteTaskCount > 9 ? "9+" : incompleteTaskCount}
                </span>
              ) : null}
              {unreadQuestionUpdateCount !== null && unreadQuestionUpdateCount > 0 ? (
                <span
                  className="inline-flex min-h-[1.25rem] shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-[0_0_0_1px_rgba(255,255,255,0.95),0_2px_10px_rgba(251,146,60,0.5)] tabular-nums sm:min-h-[1.35rem] sm:text-[11px]"
                  title={`有 ${unreadQuestionUpdateCount} 題已更新，建議重新挑戰`}
                  aria-hidden
                >
                  題目 {unreadQuestionUpdateCount > 9 ? "9+" : unreadQuestionUpdateCount}
                </span>
              ) : null}
            </span>
            {(incompleteTaskCount !== null && incompleteTaskCount > 0) ||
            (unreadQuestionUpdateCount !== null && unreadQuestionUpdateCount > 0) ? (
              <span id="nav-tasks-incomplete-hint" className="sr-only">
                {incompleteTaskCount !== null && incompleteTaskCount > 0
                  ? `尚有 ${incompleteTaskCount} 個學習任務未完成。`
                  : ""}
                {unreadQuestionUpdateCount !== null && unreadQuestionUpdateCount > 0
                  ? `有 ${unreadQuestionUpdateCount} 題測驗經老師優化，建議重新挑戰。`
                  : ""}
              </span>
            ) : null}
          </Link>
          <button
            type="button"
            onClick={() => void onLogout()}
            disabled={loggingOut}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white/85 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-rose-300/80 hover:bg-rose-50/90 hover:text-rose-900 disabled:opacity-60 sm:px-4 sm:text-base"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            {loggingOut ? "登出中…" : "登出"}
          </button>
        </div>
      </nav>
    </header>
  );
}
