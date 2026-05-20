"use client";

import type { LearningTaskListItem } from "@/domain/services/learning-task-service";
import Link from "next/link";
import { useMemo, useState } from "react";

type Props = {
  tasks: LearningTaskListItem[];
};

export function TasksListClient({ tasks }: Props) {
  const [search, setSearch] = useState("");
  const [phaseFilter, setPhaseFilter] = useState<"all" | "upcoming" | "active" | "ended">("all");
  const [classFilter, setClassFilter] = useState("");

  const classOptions = useMemo(() => {
    const s = new Set<string>();
    for (const t of tasks) s.add(t.className);
    return [...s].sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (phaseFilter !== "all" && t.phase !== phaseFilter) return false;
      if (classFilter && t.className !== classFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.assigneeDisplay.toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, phaseFilter, classFilter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end">
        <label className="block min-w-[140px] flex-1 text-sm">
          <span className="font-medium text-slate-200">搜尋任務</span>
          <input
            type="search"
            className="mt-1.5 w-full rounded-xl border border-white/15 px-3 py-2 text-sm"
            placeholder="任務名稱或指派對象"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label className="block min-w-[140px] text-sm">
          <span className="font-medium text-slate-200">班級</span>
          <select
            className="mt-1.5 w-full rounded-xl border border-white/15 px-3 py-2 text-sm"
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
        <label className="block min-w-[160px] text-sm">
          <span className="font-medium text-slate-200">任務狀態</span>
          <select
            className="mt-1.5 w-full rounded-xl border border-white/15 px-3 py-2 text-sm"
            value={phaseFilter}
            onChange={(e) => setPhaseFilter(e.target.value as typeof phaseFilter)}
          >
            <option value="all">全部</option>
            <option value="upcoming">尚未開始</option>
            <option value="active">進行中</option>
            <option value="ended">已截止</option>
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_8px_36px_-16px_rgba(0,0,0,0.45)]">
        <table className="min-w-[960px] w-full text-left text-sm">
          <thead className="bg-white/[0.08]/90 text-slate-300">
            <tr>
              <th className="px-4 py-3 font-semibold">任務名稱</th>
              <th className="px-4 py-3 font-semibold">指派對象</th>
              <th className="px-4 py-3 font-semibold">影片數量</th>
              <th className="px-4 py-3 font-semibold">開始日期</th>
              <th className="px-4 py-3 font-semibold">完成期限</th>
              <th className="px-4 py-3 font-semibold">任務完成率</th>
              <th className="px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  {tasks.length === 0 ? (
                    <>
                      <p className="font-medium text-slate-200">目前尚未建立學習任務</p>
                      <p className="mt-2 text-sm">請先建立任務，系統才會開始追蹤學生學習進度</p>
                    </>
                  ) : (
                    <p>沒有符合篩選條件的任務</p>
                  )}
                </td>
              </tr>
            ) : (
              filtered.map((t) => (
                <tr key={t.id} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-slate-50">{t.title}</td>
                  <td className="px-4 py-3 text-slate-300">{t.assigneeDisplay}</td>
                  <td className="px-4 py-3 text-slate-300">{t.videoCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300">{t.startDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-300">{t.endDate}</td>
                  <td className="px-4 py-3 text-slate-200">{t.aggregateCompletionRate}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-3">
                      <Link
                        className="text-cyan-300 underline text-xs font-medium"
                        href={`/admin/tasks/${t.id}`}
                      >
                        查看任務
                      </Link>
                      <Link
                        className="text-cyan-300 underline text-xs font-medium"
                        href={`/admin/tasks/${t.id}/progress`}
                      >
                        查看進度
                      </Link>
                      <Link
                        className="text-slate-300 underline text-xs"
                        href={`/admin/tasks/${t.id}/edit`}
                      >
                        編輯任務
                      </Link>
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
