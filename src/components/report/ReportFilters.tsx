"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type Scope = { id: string; title: string };
type Task = { id: string; title: string; startDate: string };

type Props = {
  studentId: string;
  examScopes: Scope[];
  tasks: Task[];
  currentExamScopeId: string | null;
  currentTaskId: string | null;
};

export function ReportFilters({
  studentId,
  examScopes,
  tasks,
  currentExamScopeId,
  currentTaskId,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const push = useCallback(
    (next: { examScopeId?: string | null; taskId?: string | null }) => {
      const p = new URLSearchParams(searchParams.toString());
      if (next.examScopeId !== undefined) {
        if (next.examScopeId) p.set("examScopeId", next.examScopeId);
        else p.delete("examScopeId");
      }
      if (next.taskId !== undefined) {
        if (next.taskId) p.set("taskId", next.taskId);
        else p.delete("taskId");
      }
      router.push(`/admin/students/${studentId}/report?${p.toString()}`);
    },
    [router, searchParams, studentId],
  );

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
      <label className="block text-sm">
        <span className="font-medium text-slate-800">班級篩選（段考範圍）</span>
        <p className="text-xs text-slate-500">選擇要統計的課程範圍</p>
        <select
          className="mt-1.5 min-h-11 w-full min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 sm:w-auto"
          value={currentExamScopeId ?? ""}
          onChange={(e) => push({ examScopeId: e.target.value || null })}
        >
          {examScopes.length === 0 ? (
            <option value="">（尚未設定範圍）</option>
          ) : (
            examScopes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))
          )}
        </select>
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-800">任務狀態</span>
        <p className="text-xs text-slate-500">選擇要對應的學習任務（影響完成進度區塊）</p>
        <select
          className="mt-1.5 min-h-11 w-full min-w-[220px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 sm:w-auto"
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
  );
}
