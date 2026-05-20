"use client";

import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Info } from "lucide-react";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { YouTubeProgressPlayer } from "@/components/student/YouTubeProgressPlayer";
import { VideoComprehensionQuizClient } from "@/components/student/VideoComprehensionQuizClient";

type Props = {
  unitId: string;
  videoId: string;
  youtubeVideoId: string;
  title: string;
  initialPosition: number;
  quizId: string | null;
  canTakeQuiz: boolean;
  fromTask: boolean;
  taskId: string | null;
};

export function VideoPageClient({
  unitId,
  videoId,
  youtubeVideoId,
  title,
  initialPosition,
  quizId,
  canTakeQuiz,
  fromTask,
  taskId,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(canTakeQuiz);
  const [quizPassedTick, setQuizPassedTick] = useState(0);

  const onProgressSync = useCallback(
    async (payload: {
      currentTimeSeconds: number;
      durationSeconds: number;
      incrementView: boolean;
    }) => {
      const res = await fetch("/api/video-progress/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoId,
          currentTimeSeconds: payload.currentTimeSeconds,
          durationSeconds: payload.durationSeconds,
          incrementView: payload.incrementView,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.canTakeQuiz) {
        setUnlocked(true);
        setStatus("觀看進度已達標，可開始影片理解測驗。");
      }
      if (res.ok && data.isCompleted) {
        setQuizPassedTick((n) => n + 1);
      }
    },
    [videoId],
  );

  const backHref = fromTask
    ? `/student/tasks${taskId ? `?taskId=${encodeURIComponent(taskId)}` : ""}`
    : `/student/unit/${unitId}`;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-cyan-200/60 bg-white/75 p-4 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.2)] backdrop-blur-xl sm:p-5"
      >
        <StudentBackLink href={backHref}>
          {fromTask ? "返回學習任務" : "返回單元影片列表"}
        </StudentBackLink>
      </motion.div>

      <YouTubeProgressPlayer
        videoId={youtubeVideoId}
        title={title}
        initialSeconds={initialPosition}
        onProgressSync={onProgressSync}
      />

      {status ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-2 rounded-2xl border border-emerald-200/70 bg-emerald-50/90 px-4 py-3 text-sm font-medium text-emerald-900 shadow-sm"
        >
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          {status}
        </motion.p>
      ) : null}

      <VideoComprehensionQuizClient
        key={`${quizId ?? "none"}-${quizPassedTick}-${unlocked ? "u" : "l"}`}
        quizId={quizId}
        unlocked={unlocked}
        onPassed={() => {
          setStatus("已完成本影片預習");
          setQuizPassedTick((n) => n + 1);
        }}
      />
    </div>
  );
}
