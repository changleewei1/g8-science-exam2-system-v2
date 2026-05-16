"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type PracticeResourcePanelProps = {
  onPracticeNext: () => void;
  isMastered: boolean;
  skillCode: string;
  returnHref?: string;
  returnLabel?: string;
};

export function PracticeResourcePanel({
  onPracticeNext,
  isMastered,
  skillCode,
  returnHref = "/student/lab",
  returnLabel = "返回技能樹練習",
}: PracticeResourcePanelProps) {
  const router = useRouter();
  const [videoHint, setVideoHint] = useState<string | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);

  async function goSkillVideo() {
    setLoadingVideo(true);
    setVideoHint(null);
    try {
      const res = await fetch(`/api/student/skill-video?skillCode=${encodeURIComponent(skillCode)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setVideoHint(
          typeof data?.message === "string"
            ? data.message
            : "目前尚未找到此觀念對應的影片，請先回到學習單元選擇影片。",
        );
        return;
      }
      if (data?.video?.id) {
        router.push(`/student/video/${data.video.id}`);
        return;
      }
      setVideoHint(
        typeof data?.message === "string"
          ? data.message
          : "目前尚未找到此觀念對應的影片，請先回到學習單元選擇影片。",
      );
    } catch {
      setVideoHint("目前尚未找到此觀念對應的影片，請先回到學習單元選擇影片。");
    } finally {
      setLoadingVideo(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">更多學習資源</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => void goSkillVideo()}
          disabled={loadingVideo}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50"
        >
          {loadingVideo ? "查找影片中…" : "回看影片"}
        </button>
        <button
          type="button"
          onClick={onPracticeNext}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50"
        >
          再練一題
        </button>
        <Link
          href="/student/dashboard#exam-scopes"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50"
        >
          查看學習狀況
        </Link>
        <Link
          href={returnHref}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 hover:border-teal-300 hover:bg-teal-50"
        >
          {returnLabel}
        </Link>
      </div>
      {videoHint ? <p className="mt-3 text-sm text-amber-800">{videoHint}</p> : null}
      {isMastered ? (
        <p className="mt-4 text-sm text-emerald-700">你已達成精熟，可改做其他觀念，或再練一題鞏固記憶。</p>
      ) : null}
    </section>
  );
}
