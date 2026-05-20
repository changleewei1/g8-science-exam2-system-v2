"use client";

import { usePathname } from "next/navigation";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";

/**
 * 老師後台根 layout：登入頁獨立；其餘與學生端相同亮色科技底。
 */
export function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }
  return (
    <div className="relative min-h-[100dvh] overflow-hidden text-slate-800">
      <StudentLightTechBackground position="absolute" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
