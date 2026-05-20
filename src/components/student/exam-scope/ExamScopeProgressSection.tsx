"use client";

import { motion } from "framer-motion";

type BarProps = {
  label: string;
  value: number;
  max?: number;
  tint: "cyan" | "indigo";
  index: number;
};

function TechProgressBar({ label, value, max = 100, tint, index }: BarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const fill =
    tint === "cyan"
      ? "from-cyan-500 to-sky-500 shadow-[0_0_14px_rgba(6,182,212,0.35)]"
      : "from-indigo-500 to-violet-500 shadow-[0_0_14px_rgba(99,102,241,0.35)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.08 * index, duration: 0.4 }}
      className="rounded-2xl border border-slate-200/80 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5"
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-800">{label}</span>
        <span className="text-sm font-bold tabular-nums text-cyan-800">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-200/60">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${fill}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1], delay: 0.12 + index * 0.06 }}
        />
      </div>
    </motion.div>
  );
}

type Props = {
  videoCompletion: number;
  quizPass: number;
};

export function ExamScopeProgressSection({ videoCompletion, quizPass }: Props) {
  return (
    <section
      className="mb-8 rounded-3xl border border-cyan-200/50 bg-white/70 p-5 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.2)] backdrop-blur-xl sm:p-7"
      aria-labelledby="exam-scope-progress-heading"
    >
      <h2 id="exam-scope-progress-heading" className="mb-4 text-base font-bold text-slate-900">
        整體進度
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <TechProgressBar
          label="影片完成率（範圍內）"
          value={videoCompletion}
          tint="cyan"
          index={0}
        />
        <TechProgressBar
          label="測驗通過率（已提交次數）"
          value={quizPass}
          tint="indigo"
          index={1}
        />
      </div>
    </section>
  );
}
