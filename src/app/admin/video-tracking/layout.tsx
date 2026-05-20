import Link from "next/link";
import { HomeBackLink } from "@/components/ui/HomeBackLink";
import { adminNavLink, adminNavLinkActive, adminTopHeader, adminTopHeaderInner, adminMainColumn } from "@/lib/admin-ui";

export default function VideoTrackingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className={adminTopHeader}>
        <div className={adminTopHeaderInner}>
          <div className="flex flex-wrap items-center gap-3">
            <HomeBackLink variant="admin" />
            <span className="hidden h-6 w-px bg-cyan-200/70 sm:block" aria-hidden />
            <span className="shrink-0 text-sm font-semibold text-slate-900 sm:text-base">老師｜學習進度追蹤</span>
          </div>
          <nav className="flex flex-wrap gap-x-3 gap-y-2 text-sm">
            <Link className={adminNavLink} href="/admin">
              後台首頁
            </Link>
            <Link className={adminNavLinkActive} href="/admin/video-tracking">
              總覽
            </Link>
            <Link className={adminNavLink} href="/admin/video-tracking/students">
              學生
            </Link>
            <Link className={adminNavLink} href="/admin/video-tracking/videos">
              影片
            </Link>
            <Link className={adminNavLink} href="/admin/tasks">
              學習任務設定
            </Link>
          </nav>
        </div>
      </header>
      <div className={adminMainColumn}>{children}</div>
    </>
  );
}
