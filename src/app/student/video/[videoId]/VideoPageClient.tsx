"use client";

import { useCallback, useState } from "react";
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
      <div>
        <StudentBackLink href={backHref}>
          {fromTask ? "返回學習任務" : "返回單元影片列表"}
        </StudentBackLink>
      </div>
      <YouTubeProgressPlayer
        videoId={youtubeVideoId}
        title={title}
        initialSeconds={initialPosition}
        onProgressSync={onProgressSync}
      />
      {status && <p className="text-sm text-teal-800">{status}</p>}
      <VideoComprehensionQuizClient
        key={`${quizId ?? "none"}-${quizPassedTick}-${unlocked ? "u" : "l"}`}
        quizId={quizId}
        unlocked={unlocked}
        onPassed={() => {
          setStatus("✅ 已完成本影片預習");
          setQuizPassedTick((n) => n + 1);
        }}
      />
    </div>
  );
}
