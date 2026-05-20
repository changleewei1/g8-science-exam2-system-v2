"use client";

import type { StudentOverviewRow } from "@/domain/services/admin-dashboard-service";
import { StudentListRowActions } from "@/components/admin/StudentListRowActions";
import { AdminProgressBar } from "@/components/admin/ProgressBar";
import { cn } from "@/lib/utils";

type Props = {
  rows: StudentOverviewRow[];
  examScopeId: string | null;
};

function formatLastLearned(iso: string | null): string {
  if (!iso) return "尚未開始";
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "尚未開始";
  }
}

export function VideoTrackingStudentTable({ rows, examScopeId }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.04] shadow-lg backdrop-blur-md">
      <table className="min-w-[960px] w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/[0.06] text-slate-300">
          <tr>
            <th className="px-4 py-3 font-semibold">學生</th>
            <th className="px-4 py-3 font-semibold">任務完成率</th>
            <th className="px-4 py-3 font-semibold">影片完成度</th>
            <th className="px-4 py-3 font-semibold">測驗表現</th>
            <th className="px-4 py-3 font-semibold whitespace-nowrap">最後學習時間</th>
            <th className="px-4 py-3 font-semibold">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                <p className="font-medium text-slate-200">目前尚無符合條件的學生</p>
                <p className="mt-2 text-sm">請調整學習範圍或搜尋條件後再試</p>
              </td>
            </tr>
          ) : (
            rows.map((s) => (
              <tr
                key={s.studentId}
                className="border-t border-white/5 align-top transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-4">
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-slate-400">{s.studentCode}</p>
                  {s.className ? (
                    <span className="mt-2 inline-flex rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-xs font-medium text-cyan-200">
                      {s.className} 班
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex rounded-md border border-white/10 px-2 py-0.5 text-xs text-slate-500">
                      未分班
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-slate-300">
                  {s.taskCompletionRate == null ? (
                    <span className="text-sm text-slate-500">尚未指定任務</span>
                  ) : (
                    <span className="font-medium tabular-nums text-slate-200">
                      {s.taskCompletionRate}%
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 min-w-[120px]">
                  <AdminProgressBar value={s.videoCompletionRate} />
                </td>
                <td className="px-4 py-4 min-w-[120px]">
                  <AdminProgressBar value={s.quizPassRate} barClassName="from-violet-400 via-purple-500 to-indigo-500" />
                </td>
                <td className={cn("px-4 py-4 whitespace-nowrap text-slate-400", !s.lastActivityAt && "text-slate-500")}>
                  {formatLastLearned(s.lastActivityAt)}
                </td>
                <td className="px-4 py-4">
                  <StudentListRowActions
                    studentId={s.studentId}
                    examScopeId={examScopeId}
                    showUrlInline={false}
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
