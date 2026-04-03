"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-md">
        <div ref={containerRef} className="h-full w-full" />
      </div>
      {!ready && (
        <p className="text-sm text-slate-500">正在載入播放器…</p>
      )}
    </div>
  );
}
