"use client";

import Link from "next/link";
import { AlertTriangle, BarChart3, ClipboardCheck, Users } from "lucide-react";
import type { ExamScopeLike } from "@/lib/admin/learning-scope";
import type { TeacherClassCardDto } from "@/lib/admin/teacher-tracking-types";
import { cn } from "@/lib/utils";

type Props = {
  teacherLabel: string;
  examScopes: ExamScopeLike[];
  classes: TeacherClassCardDto[];
  loading?: boolean;
};

function pickExamScopes(scopes: ExamScopeLike[]): [ExamScopeLike | null, ExamScopeLike | null] {
  const second = scopes.find((s) => s.examNo === 2) ?? scopes[0] ?? null;
  const third = scopes.find((s) => s.examNo === 3) ?? scopes[1] ?? null;
  return [second, third];
}

export function ClassOverviewCards({ teacherLabel, examScopes, classes, loading }: Props) {
  const [s2, s3] = pickExamScopes(examScopes);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-800/80">學習追蹤</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">📘 {teacherLabel}</h1>
          <p className="mt-1 text-sm text-slate-600">請選擇班級查看各段考學習數據與學生列表</p>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
          loading && "pointer-events-none opacity-60",
        )}
      >
        {classes.map((c) => {
          const stat2 = s2 ? c.byExamScope[s2.id] : undefined;
          const stat3 = s3 ? c.byExamScope[s3.id] : undefined;
          const atRisk = Math.max(stat2?.incompleteCount ?? 0, stat3?.incompleteCount ?? 0);

          return (
            <Link
              key={c.classId}
              href={`/admin/video-tracking/${encodeURIComponent(c.classId)}`}
              className="group relative overflow-hidden rounded-2xl border border-cyan-200/55 bg-white/90 p-5 shadow-[0_8px_28px_-10px_rgba(14,165,233,0.15)] transition-all hover:-translate-y-0.5 hover:border-cyan-400/60 hover:shadow-[0_12px_36px_-12px_rgba(14,165,233,0.35)]"
            >
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-100/25 via-transparent to-sky-100/20 opacity-0 transition-opacity group-hover:opacity-100" />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-slate-900">{c.classId}</p>
                  <p className="mt-0.5 text-xs text-slate-500">班級</p>
                </div>
                <span className="rounded-full border border-cyan-200/80 bg-cyan-50 px-2.5 py-1 text-xs font-semibold text-cyan-900">
                  {c.studentCount} 人
                </span>
              </div>
              <dl className="relative mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-slate-200/60 bg-slate-50/80 px-3 py-2">
                  <dt className="text-[10px] font-medium text-slate-500">
                    {s2?.title?.replace("國二理化", "") ?? "段考 A"}完成率
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    {stat2 ? `${stat2.avgVideoCompletion}%` : "—"}
                  </dd>
                  <dd className="text-[10px] text-slate-500">影片均完成度</dd>
                </div>
                <div className="rounded-xl border border-slate-200/60 bg-slate-50/80 px-3 py-2">
                  <dt className="text-[10px] font-medium text-slate-500">
                    {s3?.title?.replace("國二理化", "") ?? "段考 B"}完成率
                  </dt>
                  <dd className="mt-0.5 font-semibold tabular-nums text-slate-900">
                    {stat3 ? `${stat3.avgVideoCompletion}%` : "—"}
                  </dd>
                  <dd className="text-[10px] text-slate-500">影片均完成度</dd>
                </div>
              </dl>
              <div className="relative mt-3 flex items-center gap-2 rounded-xl border border-amber-200/50 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
                <span>
                  <strong className="font-semibold">待加強</strong>（影片或測驗未全完成）約{" "}
                  <strong>{atRisk}</strong> 人
                </span>
              </div>
              <p className="relative mt-3 text-center text-xs font-semibold text-cyan-800 group-hover:underline">
                進入班級儀表板 →
              </p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-200/40 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <BarChart3 className="h-8 w-8 text-cyan-700" />
          班級頁可切換段考並查看影片／測驗統一儀表板
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-200/40 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <ClipboardCheck className="h-8 w-8 text-sky-700" />
          第二次與第三次段考共用同一套元件與樣式
        </div>
        <div className="flex items-center gap-3 rounded-2xl border border-cyan-200/40 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <Users className="h-8 w-8 text-violet-700" />
          手機版班級改為橫向捲動，桌面版維持左欄
        </div>
      </div>
    </section>
  );
}
