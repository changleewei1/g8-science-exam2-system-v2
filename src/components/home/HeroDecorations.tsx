"use client";

import { motion } from "framer-motion";

/** 左側原子模型 + 右側 HUD 圖表（純 SVG，科幻裝飾） */
export function HeroDecorations() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute left-[2%] top-[28%] hidden opacity-70 lg:block xl:left-[6%]"
        animate={{ y: [0, -12, 0], rotate: [0, 4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="200" height="200" viewBox="0 0 200 200" className="drop-shadow-[0_0_24px_rgba(34,211,238,0.5)]">
          <circle cx="100" cy="100" r="14" fill="url(#atomCore)" />
          <ellipse
            cx="100"
            cy="100"
            rx="72"
            ry="28"
            fill="none"
            stroke="rgba(34,211,238,0.55)"
            strokeWidth="1.5"
            transform="rotate(25 100 100)"
          />
          <ellipse
            cx="100"
            cy="100"
            rx="72"
            ry="28"
            fill="none"
            stroke="rgba(99,102,241,0.5)"
            strokeWidth="1.5"
            transform="rotate(-35 100 100)"
          />
          <ellipse cx="100" cy="100" rx="28" ry="72" fill="none" stroke="rgba(56,189,248,0.45)" strokeWidth="1.5" />
          <circle cx="172" cy="100" r="5" fill="#22d3ee" className="animate-pulse" />
          <circle cx="28" cy="100" r="4" fill="#818cf8" />
          <defs>
            <radialGradient id="atomCore">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#2563eb" />
            </radialGradient>
          </defs>
        </svg>
        <svg className="absolute -bottom-4 left-8 opacity-60" width="64" height="80" viewBox="0 0 64 80">
          <path
            d="M20 8h24l8 44c2 10-4 18-20 18s-22-8-20-18l8-44z"
            fill="none"
            stroke="rgba(34,211,238,0.4)"
            strokeWidth="1.5"
          />
          <path d="M24 52h16" stroke="rgba(34,211,238,0.3)" strokeWidth="1" />
        </svg>
      </motion.div>

      <motion.div
        className="absolute right-[2%] top-[26%] hidden opacity-75 lg:block xl:right-[5%]"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      >
        <motion.div className="rounded-2xl border border-cyan-500/30 bg-slate-900/40 p-4 shadow-[0_0_40px_rgba(99,102,241,0.25)] backdrop-blur-md">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest text-cyan-300/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            AI Analytics
          </div>
          <svg width="220" height="120" viewBox="0 0 220 120">
            <polyline
              points="10,90 40,70 70,75 100,45 130,50 160,30 190,35 210,20"
              fill="none"
              stroke="url(#lineGrad)"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {[40, 70, 100, 130, 160].map((x, i) => (
              <rect
                key={i}
                x={x - 8}
                y={90 - (i + 1) * 12}
                width="16"
                height={(i + 1) * 12}
                fill="rgba(34,211,238,0.25)"
                rx="2"
              />
            ))}
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[9px] text-slate-400">
            <span>診斷 92%</span>
            <span>練習 847</span>
            <span>成長 +18%</span>
          </div>
        </motion.div>
        <svg className="absolute -right-2 -top-6 opacity-50" width="56" height="72" viewBox="0 0 56 72">
          <path
            d="M28 4v48M18 52h20l-4 16H22l-4-16z"
            fill="none"
            stroke="rgba(167,139,250,0.5)"
            strokeWidth="1.5"
          />
        </svg>
      </motion.div>
    </div>
  );
}
