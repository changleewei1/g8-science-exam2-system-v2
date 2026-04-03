"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { YouTubeProgressPlayer } from "@/components/student/YouTubeProgressPlayer";

type Props = {
  unitId: string;
  videoId: string;
  youtubeVideoId: string;
  title: string;
  initialPosition: number;
  quizId: string | null;
  canTakeQuiz: boolean;
};

export function VideoPageClient({
  unitId,
  videoId,
  youtubeVideoId,
  title,
  initialPosition,
  quizId,
  canTakeQuiz,
}: Props) {
  const [status, setStatus] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(canTakeQuiz);

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
        setStatus("觀看進度已達標，可開始測驗。");
      }
    },
    [videoId],
  );

  return (
    <div className="space-y-6">
      <div>
        <StudentBackLink href={`/student/unit/${unitId}`}>返回上一頁</StudentBackLink>
      </div>
      <YouTubeProgressPlayer
        videoId={youtubeVideoId}
        title={title}
        initialSeconds={initialPosition}
        onProgressSync={onProgressSync}
      />
      {status && <p className="text-sm text-teal-800">{status}</p>}
      <div className="flex flex-wrap gap-3">
        {quizId ? (
          <Link
            href={`/student/quiz/${quizId}`}
            className={`inline-flex min-h-11 items-center rounded-xl px-4 py-2 text-sm font-medium ${
              unlocked
                ? "interactive-btn bg-teal-600 text-white shadow-md"
                : "pointer-events-none bg-slate-200 text-slate-500"
            }`}
          >
            {unlocked ? "🧠 開始測驗" : "🧠 開始測驗（需觀看達 90%）"}
          </Link>
        ) : (
          <Link
            href="/student/dashboard"
            className="interactive-btn inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm"
          >
            查看進度
          </Link>
        )}
      </div>
    </div>
  );
}
