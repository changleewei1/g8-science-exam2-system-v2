"use client";

import type { ExamScopeLike } from "@/lib/admin/learning-scope";
import { cn } from "@/lib/utils";

type Props = {
  scopes: ExamScopeLike[];
  value: string | null;
  onChange: (examScopeId: string) => void;
  disabled?: boolean;
};

export function ExamScopeTabs({ scopes, value, onChange, disabled }: Props) {
  if (scopes.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
        目前沒有符合條件的段考範圍，請確認 exam_scopes 與 TEACHER_TRACKING_GRADE／SUBJECT 設定。
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="段考範圍"
      className="flex flex-wrap gap-2 rounded-2xl border border-cyan-200/50 bg-white/80 p-1.5 shadow-inner"
    >
      {scopes.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(s.id)}
            className={cn(
              "min-h-10 rounded-xl px-4 py-2 text-sm font-semibold transition-all",
              active
                ? "bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/25"
                : "text-slate-600 hover:bg-cyan-50/80 hover:text-cyan-900",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            {s.title}
          </button>
        );
      })}
    </div>
  );
}
