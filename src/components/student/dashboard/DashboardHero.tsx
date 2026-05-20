"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, Zap } from "lucide-react";
import type { DashboardHeroStats } from "@/lib/student-dashboard-types";
import { Button } from "@/components/ui/button";

type Props = {
  studentName: string;
  hero: DashboardHeroStats;
};

function ProgressRing({ value, label }: { value: number; label: string }) {
  const pct = Math.min(100, Math.max(0, value));
  const r = 52;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative flex h-[140px] w-[140px] shrink-0 items-center justify-center sm:h-[156px] sm:w-[156px]">
      <svg className="-rotate-90" width="140" height="140" viewBox="0 0 140 140" aria-hidden>
        <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <motion.circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="url(#heroRingGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
        <defs>
          <linearGradient id="heroRingGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      <motion.div
        className="absolute inset-0 rounded-full shadow-[0_0_48px_rgba(34,211,238,0.25)]"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      <motion.div
        className="absolute flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        <span className="text-3xl font-bold text-white sm:text-4xl">{pct}%</span>
        <span className="text-[10px] font-medium uppercase tracking-wider text-cyan-200/80">{label}</span>
      </motion.div>
    </div>
  );
}

export function DashboardHero({ studentName, hero }: Props) {
  const skillLabel =
    hero.totalSkills > 0 ? `${hero.masteredSkills} / ${hero.totalSkills}` : `${hero.masteredSkills}`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className="relative overflow-hidden rounded-3xl border border-cyan-400/25 bg-gradient-to-br from-slate-900/90 via-[#0c1929]/95 to-slate-950/90 p-5 shadow-[0_0_60px_rgba(34,211,238,0.12)] backdrop-blur-xl sm:p-8"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-500/20 blur-3xl" />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: `linear-gradient(rgba(56,189,248,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.15) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
        }}
        animate={{ opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <motion.div
        className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.1 } },
        }}
      >
        <div className="min-w-0 flex-1">
          <motion.p
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            className="text-sm text-cyan-200/80"
          >
            你好，{studentName}
          </motion.p>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            className="mt-2 flex items-center gap-2"
          >
            <Sparkles className="h-6 w-6 text-cyan-400" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">AI 智慧學習中心</h1>
          </motion.div>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
            className="mt-3 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base"
          >
            依照段考範圍進行影片學習、技能練習與 AI 智慧診斷
          </motion.p>

          {hero.recommendedScopeId ? (
            <motion.div
              variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
              className="mt-5 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3"
            >
              <p className="text-xs font-medium text-cyan-200/90">建議下一步</p>
              <p className="mt-1 text-sm font-semibold text-white">{hero.recommendedScopeTitle}</p>
              <Link href={`/student/exam-scope/${hero.recommendedScopeId}`} className="mt-3 inline-block">
                <Button variant="student" size="default" className="gap-2">
                  <Zap className="h-4 w-4" aria-hidden />
                  開始學習
                </Button>
              </Link>
            </motion.div>
          ) : null}
        </div>

        <motion.div
          variants={{ hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1 } }}
          className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:justify-end"
        >
          <ProgressRing value={hero.overallCompletion} label="學習進度" />
          <div className="grid min-w-[140px] gap-3 text-sm">
            <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">已完成技能</p>
              <p className="mt-0.5 text-xl font-bold text-emerald-300">{skillLabel}</p>
            </div>
            <motion.div
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm"
              whileHover={{ borderColor: "rgba(34,211,238,0.4)" }}
            >
              <p className="text-[10px] uppercase tracking-wide text-slate-400">本週學習</p>
              <p className="mt-0.5 text-lg font-bold text-cyan-200">{hero.weeklyLearningLabel}</p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}
