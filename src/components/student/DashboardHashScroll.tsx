"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** 導向 /student/dashboard#exam-scopes 時，確保捲動到段考區塊（Next 同路徑 hash 有時不會自動捲動） */
export function DashboardHashScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/student/dashboard") return;

    const scrollToExamScopes = () => {
      if (typeof window === "undefined") return;
      if (window.location.hash !== "#exam-scopes") return;
      document.getElementById("exam-scopes")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    scrollToExamScopes();
    const t1 = window.setTimeout(scrollToExamScopes, 0);
    const t2 = window.setTimeout(scrollToExamScopes, 150);
    const t3 = window.setTimeout(scrollToExamScopes, 450);
    window.addEventListener("hashchange", scrollToExamScopes);
    window.addEventListener("popstate", scrollToExamScopes);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.removeEventListener("hashchange", scrollToExamScopes);
      window.removeEventListener("popstate", scrollToExamScopes);
    };
  }, [pathname]);

  return null;
}
