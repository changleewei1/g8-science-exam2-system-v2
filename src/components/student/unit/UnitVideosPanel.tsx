"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BrainCircuit, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type UnitVideoRowSerialized = {
  videoId: string;
  title: string;
  completionRate: number;
  isCompleted: boolean;
  canTakeQuiz: boolean;
  quizId: string | null;
  quizPassed: boolean;
};

type Props = {
  unitId: string;
  videos: UnitVideoRowSerialized[];
};

function VideoProgressBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="mt-4">
      <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
        <span>觀看完成度</span>
        <span className="tabular-nums text-cyan-800">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-200/60">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function VideoCard({ row, unitId, index }: { row: UnitVideoRowSerialized; unitId: string; index: number }) {
  const videoHref = `/student/video/${row.videoId}`;
  const quizHref = row.quizId
    ? `/student/quiz/${row.quizId}?unitId=${encodeURIComponent(unitId)}`
    : "#";

  const statusBits = [
    row.isCompleted ? "已觀看完畢" : null,
    row.quizPassed ? "測驗通過" : row.canTakeQuiz ? "可測驗" : null,
  ].filter(Boolean);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      whileHover={{ y: -2, scale: 1.01 }}
      className={cn(
        "overflow-hidden rounded-3xl border border-cyan-200/60 bg-white/85 p-5 shadow-[0_8px_28px_-12px_rgba(14,165,233,0.2)] backdrop-blur-md transition",
        "hover:border-cyan-300 hover:shadow-[0_12px_36px_-8px_rgba(34,211,238,0.25)] sm:p-6",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={videoHref}
            className="text-lg font-bold text-slate-900 underline decoration-cyan-300/70 decoration-2 underline-offset-4 transition hover:text-cyan-900 hover:decoration-cyan-500"
          >
            {row.title}
          </Link>
          <p className="mt-2 text-xs font-medium text-slate-500">
            完成率 {row.completionRate.toFixed(0)}%
            {statusBits.length > 0 ? ` · ${statusBits.join(" · ")}` : ""}
          </p>
          <VideoProgressBar value={row.completionRate} />
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
          <Link
            href={videoHref}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-[0_4px_20px_-4px_rgba(8,145,178,0.5)] transition hover:brightness-105"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden />
            觀看影片
          </Link>
          {row.quizId ? (
            <Link
              href={quizHref}
              className={cn(
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold transition",
                row.canTakeQuiz
                  ? "border border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm hover:border-indigo-300 hover:bg-indigo-100/90"
                  : "pointer-events-none cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400",
              )}
              aria-disabled={!row.canTakeQuiz}
            >
              <BrainCircuit className="h-4 w-4 shrink-0" aria-hidden />
              AI 學習診斷
            </Link>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

export function UnitVideosPanel({ unitId, videos }: Props) {
  return (
    <section aria-labelledby="unit-videos-heading">
      <h2 id="unit-videos-heading" className="mb-4 text-base font-bold text-slate-900">
        影片列表
      </h2>
      <ul className="space-y-5">
        {videos.map((row, index) => (
          <VideoCard key={row.videoId} row={row} unitId={unitId} index={index} />
        ))}
      </ul>
    </section>
  );
}

export function UnitVideosEmpty({
  examScopeId,
}: {
  examScopeId: string;
}) {
  return (
    <section aria-labelledby="unit-videos-heading">
      <h2 id="unit-videos-heading" className="mb-4 text-base font-bold text-slate-900">
        影片列表
      </h2>
      <div className="rounded-3xl border border-slate-200/90 bg-white/90 p-8 text-center shadow-[0_8px_32px_-12px_rgba(14,165,233,0.15)] backdrop-blur-sm sm:p-10">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-cyan-500" aria-hidden />
        <p className="font-semibold text-slate-900">此單元尚無可觀看的影片</p>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
          可能尚未從教材播放清單匯入，或影片尚未對應到本單元。請向授課老師確認；老師可在後台將 YouTube 影片匯入並指定所屬單元後，列表就會出現。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href={`/student/exam-scope/${examScopeId}`}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-300/80 bg-white px-5 text-sm font-semibold text-cyan-900 shadow-sm transition hover:bg-cyan-50/80"
          >
            返回段考範圍
          </Link>
          <Link
            href="/student/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-[0_4px_20px_-4px_rgba(8,145,178,0.5)] transition hover:brightness-105"
          >
            選擇其他段考
          </Link>
        </div>
      </div>
    </section>
  );
}
