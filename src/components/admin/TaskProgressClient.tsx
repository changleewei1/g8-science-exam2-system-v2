"use client";

import type { AdminTaskProgressDetail } from "@/domain/services/learning-task-service";
import { ReportShareInline } from "@/components/admin/ReportShareInline";
import Link from "next/link";
import { useMemo, useState } from "react";

type Props = {
  taskId: string;
  detail: AdminTaskProgressDetail;
};

export function TaskProgressClient({ taskId, detail }: Props) {
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  const classOptions = useMemo(() => {
    const s = new Set<string>();
    for (const st of detail.students) {
      if (st.className) s.add(st.className);
    }
    return [...s].sort();
  }, [detail.students]);

  const filtered = useMemo(() => {
    return detail.students.filter((s) => {
      if (onlyIncomplete && s.completionRate >= 100) return false;
      if (onlyOverdue && s.statusLabel !== "逾期未完成") return false;
      if (classFilter && (s.className ?? "") !== classFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.studentCode.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [detail.students, onlyIncomplete, onlyOverdue, classFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[160px] flex-1 text-sm">
          <span className="font-medium text-slate-800">搜尋學生</span>
          <input
            type="search"
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            placeholder="姓名或學號"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="block min-w-[120px] text-sm">
          <span className="font-medium text-slate-800">班級</span>
          <select
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
          >
            <option value="">全部</option>
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c} 班
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
          />
          只看未完成
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
          <input
            type="checkbox"
            className="rounded border-slate-300"
            checked={onlyOverdue}
            onChange={(e) => setOnlyOverdue(e.target.checked)}
          />
          只看逾期
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-md">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-100/90 text-slate-700">
            <tr>
              <th className="px-3 py-2 font-semibold">學生姓名</th>
              <th className="px-3 py-2 font-semibold">班級</th>
              <th className="px-3 py-2 font-semibold">影片進度</th>
              <th className="px-3 py-2 font-semibold">任務完成率</th>
              <th className="px-3 py-2 font-semibold">測驗</th>
              <th className="px-3 py-2 font-semibold">測驗表現</th>
              <th className="px-3 py-2 font-semibold">最後學習時間</th>
              <th className="px-3 py-2 font-semibold">狀態</th>
              <th className="px-3 py-2 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-600">
                  沒有符合條件的學生
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.studentId} className="border-t border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-900">{s.name}</td>
                  <td className="px-3 py-2 text-slate-700">{s.className ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-800">
                    {s.completedCount} / {s.totalVideos}
                  </td>
                  <td className="px-3 py-2">{s.completionRate}%</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                    {s.quizzesPassed} / {s.quizzesTotal}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{s.quizSummary}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-slate-600 text-xs">
                    {s.lastActivityAt
                      ? new Date(s.lastActivityAt).toLocaleString("zh-TW", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        s.statusLabel === "已完成"
                          ? "text-teal-800"
                          : s.statusLabel === "逾期未完成"
                            ? "font-medium text-red-700"
                            : s.statusLabel === "尚未開始"
                              ? "text-slate-500"
                              : "text-slate-800"
                      }
                    >
                      {s.statusLabel}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1 sm:flex-row sm:gap-2">
                      <Link
                        href={`/admin/students/${s.studentId}/report?taskId=${encodeURIComponent(taskId)}`}
                        className="text-teal-700 underline text-xs font-medium"
                      >
                        查看學習報告
                      </Link>
                      <ReportShareInline studentId={s.studentId} taskId={taskId} />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
