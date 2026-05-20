"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ACADEMIC_YEAR_OPTIONS,
  CLASS_OPTIONS,
  EXAM_OPTIONS,
  GRADE_OPTIONS,
  SUBJECT_OPTIONS,
  type LearningScope,
} from "@/lib/admin/learning-scope";
import { cn } from "@/lib/utils";

type Props = {
  draft: LearningScope;
  onChange: (next: LearningScope) => void;
  onApply: () => void;
  loading?: boolean;
};

const selectClass =
  "h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-inner outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/60";

const labelClass = "mb-1.5 block text-xs font-medium text-slate-600";

export function LearningScopeFilter({ draft, onChange, onApply, loading }: Props) {
  function patch(partial: Partial<LearningScope>) {
    onChange({ ...draft, ...partial });
  }

  return (
    <div className="rounded-2xl border border-cyan-200/60 bg-white p-4 shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-cyan-700" />
        <h2 className="text-sm font-semibold text-slate-900">學習範圍篩選</h2>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div>
          <label className={labelClass} htmlFor="filter-year">
            學年度
          </label>
          <select
            id="filter-year"
            className={selectClass}
            value={draft.academicYear}
            onChange={(e) => patch({ academicYear: e.target.value })}
          >
            {ACADEMIC_YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-grade">
            年級
          </label>
          <select
            id="filter-grade"
            className={selectClass}
            value={draft.grade}
            onChange={(e) => patch({ grade: e.target.value })}
          >
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-subject">
            科目
          </label>
          <select
            id="filter-subject"
            className={selectClass}
            value={draft.subject}
            onChange={(e) => patch({ subject: e.target.value })}
          >
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-exam">
            段考範圍
          </label>
          <select
            id="filter-exam"
            className={selectClass}
            value={draft.exam}
            onChange={(e) => patch({ exam: e.target.value })}
          >
            {EXAM_OPTIONS.map((ex) => (
              <option key={ex} value={ex}>
                {ex}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="filter-class">
            班級
          </label>
          <select
            id="filter-class"
            className={selectClass}
            value={draft.classId}
            onChange={(e) => patch({ classId: e.target.value })}
          >
            {CLASS_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-1">
          <label className={labelClass} htmlFor="filter-keyword">
            搜尋學生
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="filter-keyword"
              type="search"
              placeholder="輸入學生姓名或學號"
              className={cn(selectClass, "pl-9")}
              value={draft.keyword}
              onChange={(e) => patch({ keyword: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApply();
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          type="button"
          variant="student"
          size="default"
          disabled={loading}
          onClick={onApply}
          className="min-w-[120px]"
        >
          {loading ? "查詢中…" : "套用篩選"}
        </Button>
      </div>
    </div>
  );
}
