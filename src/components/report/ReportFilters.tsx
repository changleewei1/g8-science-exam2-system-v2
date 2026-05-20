"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  EXAM_OPTIONS,
  GRADE_OPTIONS,
  SUBJECT_OPTIONS,
} from "@/lib/admin/learning-scope";
import {
  SEMESTER_OPTIONS,
  formatReportScopeLabel,
  resolveExamScopeFromReportFilter,
  studentReportFilterToSearchParams,
  type ReportExamScope,
  type StudentReportScopeFilter,
} from "@/lib/admin/student-report-scope";
import { cn } from "@/lib/utils";

type Task = { id: string; title: string; startDate: string };

type Props = {
  studentId: string;
  examScopes: ReportExamScope[];
  tasks: Task[];
  currentFilter: StudentReportScopeFilter;
  currentTaskId: string | null;
};

const selectClass =
  "mt-1.5 h-10 w-full rounded-xl border border-white/15 bg-slate-950/50 px-3 text-sm text-slate-100 shadow-sm outline-none transition-colors focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-400/20";

const labelClass = "text-xs font-medium text-slate-400";

export function ReportFilters({
  studentId,
  examScopes,
  tasks,
  currentFilter,
  currentTaskId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const resolved = useMemo(
    () => resolveExamScopeFromReportFilter(examScopes, currentFilter),
    [examScopes, currentFilter],
  );

  const push = useCallback(
    (next: { filter?: StudentReportScopeFilter; taskId?: string | null }) => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete("examScopeId");

      if (next.filter) {
        const fp = studentReportFilterToSearchParams(next.filter);
        fp.forEach((value, key) => p.set(key, value));
      }

      if (next.taskId !== undefined) {
        if (next.taskId) p.set("taskId", next.taskId);
        else p.delete("taskId");
      }

      router.push(`/admin/students/${studentId}/report?${p.toString()}`);
    },
    [router, searchParams, studentId],
  );

  function patchFilter(partial: Partial<StudentReportScopeFilter>) {
    push({ filter: { ...currentFilter, ...partial }, taskId: null });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.4)] backdrop-blur-md sm:p-5">
        <p className="text-sm font-semibold text-slate-100">學習範圍</p>
        <p className="mt-0.5 text-xs text-slate-400">依年級、學期、段考與科目選擇要統計的課程範圍</p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className={labelClass}>年級</span>
            <select
              className={selectClass}
              value={currentFilter.grade}
              onChange={(e) => patchFilter({ grade: e.target.value })}
            >
              {GRADE_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className={labelClass}>學期</span>
            <select
              className={selectClass}
              value={currentFilter.semester}
              onChange={(e) => patchFilter({ semester: e.target.value })}
            >
              {SEMESTER_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className={labelClass}>段考</span>
            <select
              className={selectClass}
              value={currentFilter.exam}
              onChange={(e) => patchFilter({ exam: e.target.value })}
            >
              {EXAM_OPTIONS.map((ex) => (
                <option key={ex} value={ex}>
                  {ex}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className={labelClass}>科目</span>
            <select
              className={selectClass}
              value={currentFilter.subject}
              onChange={(e) => patchFilter({ subject: e.target.value })}
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          {resolved ? (
            <p className="text-sm text-slate-300">
              目前範圍：
              <span className="ml-1 font-medium text-white">
                {formatReportScopeLabel(currentFilter)}
              </span>
            </p>
          ) : (
            <p className="rounded-lg border border-amber-400/35 bg-amber-950/40 px-3 py-2 text-sm text-amber-100">
              目前尚未建立此學習範圍資料
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[0_8px_32px_-16px_rgba(0,0,0,0.4)] backdrop-blur-md sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block text-sm">
          <span className="font-medium text-slate-200">任務狀態</span>
          <p className="text-xs text-slate-400">
          僅顯示與目前段考範圍相關的學習任務（影響任務完成進度區塊）
        </p>
          <select
            className={cn(selectClass, "mt-1.5 min-w-[220px]")}
            value={currentTaskId ?? ""}
            onChange={(e) => push({ taskId: e.target.value || null })}
          >
            <option value="">自動（最新任務）</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}（{t.startDate}）
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
