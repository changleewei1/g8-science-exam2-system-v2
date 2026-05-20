import Link from "next/link";
import type { ReactNode } from "react";
import { HomeBackLink } from "@/components/ui/HomeBackLink";
import {
  adminMainColumn,
  adminMainNarrow,
  adminNavLink,
  adminTopHeader,
  adminTopHeaderInner,
  adminTopHeaderInnerNarrow,
} from "@/lib/admin-ui";

type AdminStandaloneHeaderProps = {
  title: string;
  /** 右側選用（例如導到其他後台頁的連結） */
  right?: ReactNode;
  /** 較窄主內容（如題目候選頁） */
  narrow?: boolean;
};

/**
 * 無專屬 layout 的老師後台頁：統一頂欄。
 */
export function AdminStandaloneHeader({ title, right, narrow }: AdminStandaloneHeaderProps) {
  const inner = narrow ? adminTopHeaderInnerNarrow : adminTopHeaderInner;
  return (
    <header className={adminTopHeader}>
      <div className={inner}>
        <div className="flex flex-wrap items-center gap-3">
          <HomeBackLink variant="dark" href="/admin" />
          <span className="hidden h-6 w-px bg-white/15 sm:block" aria-hidden />
          <span className="text-sm font-semibold text-white sm:text-base">{title}</span>
        </div>
        {right ? <div className="flex flex-wrap items-center gap-2">{right}</div> : null}
      </div>
    </header>
  );
}

export function AdminStandaloneMain({
  narrow,
  children,
}: {
  narrow?: boolean;
  children: React.ReactNode;
}) {
  return <div className={narrow ? adminMainNarrow : adminMainColumn}>{children}</div>;
}

/** 常用：後台內文連結 */
export function AdminInlineNavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={`text-sm ${adminNavLink}`}>
      {children}
    </Link>
  );
}
