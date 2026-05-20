"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type TeacherClassNavItem = {
  classId: string;
  studentCount: number;
};

type Props = {
  items: TeacherClassNavItem[];
  currentClassId: string | null;
  /** 若 true，改為橫向捲動（手機） */
  horizontal?: boolean;
};

export function TeacherClassSidebar({ items, currentClassId, horizontal }: Props) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-6 text-center text-sm text-slate-600">
        尚無可管理的班級資料。
      </div>
    );
  }

  const list = (
    <ul
      className={cn(
        "flex gap-2",
        horizontal
          ? "max-w-full flex-row overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex-col",
      )}
    >
      {items.map((c) => {
        const active = currentClassId === c.classId;
        return (
          <li key={c.classId} className={horizontal ? "shrink-0" : undefined}>
            <Link
              href={`/admin/video-tracking/${encodeURIComponent(c.classId)}`}
              className={cn(
                "flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all",
                active
                  ? "border-cyan-400/70 bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-950 shadow-[0_0_24px_-8px_rgba(14,165,233,0.35)]"
                  : "border-cyan-200/40 bg-white/70 text-slate-800 hover:border-cyan-300/70 hover:bg-cyan-50/50 hover:shadow-md",
              )}
            >
              <span className="text-base font-bold tracking-tight">{c.classId}</span>
              <span className="flex items-center gap-1 text-xs font-medium text-slate-500">
                <Users className="h-3.5 w-3.5" aria-hidden />
                {c.studentCount}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );

  if (horizontal) {
    return (
      <nav aria-label="班級" className="w-full">
        {list}
      </nav>
    );
  }

  return (
    <nav
      aria-label="班級"
      className="w-full max-w-[220px] shrink-0 rounded-2xl border border-cyan-200/50 bg-white/85 p-3 shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] backdrop-blur-sm"
    >
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">班級</p>
      {list}
    </nav>
  );
}
