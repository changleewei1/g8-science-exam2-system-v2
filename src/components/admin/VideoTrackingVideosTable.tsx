"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Film } from "lucide-react";
import type { VideoWatchStats } from "@/domain/services/admin-dashboard-service";
import { AdminProgressBar } from "@/components/admin/ProgressBar";
import {
  groupVideosByUnit,
  progressRateTier,
  type UnitLearningGroup,
  type VideoLearningItem,
} from "@/lib/admin/video-learning-groups";
import { cn } from "@/lib/utils";

type Props = {
  videos: VideoWatchStats[];
};

function UnitSummaryStat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="text-center sm:text-left">
      <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-200">{children}</p>
    </div>
  );
}

function VideoRow({ video }: { video: VideoLearningItem }) {
  return (
    <tr className="border-t border-white/5 transition-colors hover:bg-white/[0.03]">
      <td className="max-w-[min(360px,40vw)] px-4 py-3.5 pl-6 sm:pl-8">
        <p className="line-clamp-2 text-sm font-medium text-white" title={video.title}>
          {video.title}
        </p>
      </td>
      <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-slate-300">
        {video.completedCount}/{video.totalStudents}
      </td>
      <td className="min-w-[120px] px-4 py-3.5">
        <AdminProgressBar value={video.completionRate} tier={progressRateTier(video.completionRate)} />
      </td>
      <td className="min-w-[120px] px-4 py-3.5">
        <AdminProgressBar
          value={video.averageQuizScore}
          tier={progressRateTier(video.averageQuizScore)}
        />
      </td>
      <td className="px-4 py-3.5">
        <Link
          href={`/admin/video-tracking/videos/${video.id}`}
          className="text-sm font-medium text-cyan-300 underline-offset-2 hover:text-cyan-200 hover:underline"
        >
          查看進度
        </Link>
      </td>
    </tr>
  );
}

function UnitAccordionCard({
  group,
  expanded,
  onToggle,
}: {
  group: UnitLearningGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const completionTier = progressRateTier(group.averageCompletionRate);
  const quizTier = progressRateTier(group.averageQuizScore);

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-white/[0.04] backdrop-blur-md transition-all duration-300",
        expanded
          ? "border-cyan-400/35 shadow-[0_0_32px_rgba(34,211,238,0.12)]"
          : "border-white/10 hover:border-cyan-400/30 hover:shadow-[0_0_24px_rgba(34,211,238,0.1)]",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full flex-col gap-4 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] sm:flex-row sm:items-center sm:justify-between sm:px-5"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-400/25 bg-cyan-500/10 text-cyan-300">
            <Film className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-white sm:text-lg">【{group.unitName}】</h3>
            <p className="mt-1 text-xs text-slate-500">影片數：{group.videoCount}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
          <UnitSummaryStat label="平均完成率">
            <span
              className={cn(
                completionTier === "low" && "text-amber-300",
                completionTier === "mid" && "text-cyan-200",
                completionTier === "high" && "text-emerald-300",
              )}
            >
              {group.averageCompletionRate}%
            </span>
          </UnitSummaryStat>
          <UnitSummaryStat label="平均測驗表現">
            <span
              className={cn(
                quizTier === "low" && "text-amber-300",
                quizTier === "mid" && "text-violet-200",
                quizTier === "high" && "text-emerald-300",
              )}
            >
              {group.averageQuizScore}%
            </span>
          </UnitSummaryStat>
          <UnitSummaryStat label="完成學生">
            {group.completedStudentCount}/{group.totalStudents}
          </UnitSummaryStat>
          <div className="flex items-center justify-end gap-2 sm:justify-center">
            <span className="text-xs text-slate-500">{expanded ? "收合" : "展開"}</span>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-cyan-400/80 transition-transform duration-300",
                expanded && "rotate-180",
              )}
            />
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/10 bg-slate-950/30 px-2 py-2 sm:px-3 sm:py-3">
              <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/[0.02]">
                <table className="min-w-[720px] w-full text-left text-sm">
                  <thead className="bg-white/[0.04] text-xs text-slate-400">
                    <tr>
                      <th className="px-4 py-2.5 pl-6 font-semibold sm:pl-8">影片名稱</th>
                      <th className="px-4 py-2.5 font-semibold">完成人數</th>
                      <th className="px-4 py-2.5 font-semibold">全班完成率</th>
                      <th className="px-4 py-2.5 font-semibold">平均測驗表現</th>
                      <th className="px-4 py-2.5 font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.videos.map((video) => (
                      <VideoRow key={video.id} video={video} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function VideoTrackingVideosTable({ videos }: Props) {
  const units = useMemo(() => groupVideosByUnit(videos), [videos]);
  const [expandedUnits, setExpandedUnits] = useState<Set<string>>(() => new Set());

  function toggleUnit(unitName: string) {
    setExpandedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitName)) next.delete(unitName);
      else next.add(unitName);
      return next;
    });
  }

  if (units.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-12 text-center backdrop-blur-md">
        <p className="font-medium text-slate-200">此範圍尚無影片資料</p>
        <p className="mt-2 text-sm text-slate-500">請確認段考範圍是否已匯入影片</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        共 {units.length} 個單元、{videos.length} 支影片 · 點擊單元卡片展開影片明細（預設收合）
      </p>
      {units.map((group) => (
        <UnitAccordionCard
          key={group.unitName}
          group={group}
          expanded={expandedUnits.has(group.unitName)}
          onToggle={() => toggleUnit(group.unitName)}
        />
      ))}
    </div>
  );
}
