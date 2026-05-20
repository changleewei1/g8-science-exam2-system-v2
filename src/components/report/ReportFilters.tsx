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
import { adminCard } from "@/lib/admin-ui";
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
  "mt-1.5 h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-inner outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/60";

const labelClass = "text-xs font-medium text-slate-600";

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
      <div className={cn("p-4 sm:p-5", adminCard)}>
        <p className="text-sm font-semibold text-slate-900">學習範圍</p>
        <p className="mt-0.5 text-xs text-slate-500">依年級、學期、段考與科目選擇要統計的課程範圍</p>

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

        <div className="mt-4 border-t border-slate-200/80 pt-3">
          {resolved ? (
            <p className="text-sm text-slate-600">
              目前範圍：
              <span className="ml-1 font-medium text-slate-900">
                {formatReportScopeLabel(currentFilter)}
              </span>
            </p>
          ) : (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              目前尚未建立此學習範圍資料
            </p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-end",
          adminCard,
        )}
      >
        <label className="block text-sm">
          <span className="font-medium text-slate-800">任務狀態</span>
          <p className="text-xs text-slate-500">
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
