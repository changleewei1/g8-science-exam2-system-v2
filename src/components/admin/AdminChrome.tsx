"use client";

import { usePathname } from "next/navigation";
import { AdminAppBackground } from "@/components/admin/AdminAppBackground";

/**
 * 老師後台根 layout：登入頁維持獨立樣式，其餘路由套用深色科技底。
 */
export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050810] text-slate-100">
      <AdminAppBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
