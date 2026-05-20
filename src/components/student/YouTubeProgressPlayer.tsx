"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  destroy: () => void;
};

type Props = {
  videoId: string;
  title: string;
  initialSeconds?: number;
  onProgressSync: (payload: {
    currentTimeSeconds: number;
    durationSeconds: number;
    incrementView: boolean;
  }) => Promise<void>;
};

export function YouTubeProgressPlayer({
  videoId,
  title,
  initialSeconds = 0,
  onProgressSync,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [ready, setReady] = useState(false);
  const [apiLoaded, setApiLoaded] = useState(false);
  const firstPlay = useRef(true);

  useEffect(() => {
    if (window.YT?.Player) {
      setApiLoaded(true);
      return;
    }
    window.onYouTubeIframeAPIReady = () => setApiLoaded(true);
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(tag);
  }, []);

  const sync = useCallback(async () => {
    const p = playerRef.current;
    if (!p) return;
    const current = p.getCurrentTime();
    const duration = p.getDuration() || 1;
    await onProgressSync({
      currentTimeSeconds: current,
      durationSeconds: duration,
      incrementView: false,
    });
  }, [onProgressSync]);

  useEffect(() => {
    if (!apiLoaded || !containerRef.current || !window.YT) return;
    const YT = window.YT;
    playerRef.current = new YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        start: Math.floor(initialSeconds),
        rel: 0,
        modestbranding: 1,
      },
      events: {
        onReady: () => setReady(true),
        onStateChange: (e) => {
          const playing = YT.PlayerState?.PLAYING ?? 1;
          const ended = YT.PlayerState?.ENDED ?? 0;
          if (e.data === playing) {
            void onProgressSync({
              currentTimeSeconds: e.target.getCurrentTime(),
              durationSeconds: e.target.getDuration() || 1,
              incrementView: firstPlay.current,
            });
            firstPlay.current = false;
          }
          if (e.data === ended) {
            void onProgressSync({
              currentTimeSeconds: e.target.getDuration(),
              durationSeconds: e.target.getDuration() || 1,
              incrementView: false,
            });
          }
        },
      },
    });
    const interval = window.setInterval(() => {
      void sync();
    }, 12000);
    return () => {
      window.clearInterval(interval);
      try {
        playerRef.current?.destroy();
      } catch {
        /* ignore */
      }
      playerRef.current = null;
    };
  }, [apiLoaded, videoId, initialSeconds, onProgressSync, sync]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-cyan-200/60 bg-white/80 p-4 shadow-[0_8px_40px_-12px_rgba(14,165,233,0.22)] backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-700 shadow-inner">
          <Play className="h-5 w-5 fill-current" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h2>
          {!ready && <p className="mt-2 text-sm font-medium text-slate-500">正在載入播放器…</p>}
        </div>
      </div>
      <div className="mt-4 aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 shadow-inner ring-1 ring-cyan-200/30">
        <div ref={containerRef} className="h-full w-full" />
      </div>
    </motion.section>
  );
}
