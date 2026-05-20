"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Megaphone,
  Target,
  UserRound,
  X,
} from "lucide-react";
import type { HomeAnnouncementPayload } from "@/lib/system-announcement";
import { HeroBackground } from "@/components/home/HeroBackground";
import { HeroDecorations } from "@/components/home/HeroDecorations";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    icon: Target,
    title: "精準診斷",
    lines: ["AI 分析學習弱點", "掌握關鍵觀念"],
    accent: "from-cyan-400/20 to-cyan-600/5",
    border: "border-cyan-400/25 hover:border-cyan-400/50 hover:shadow-[0_0_32px_rgba(34,211,238,0.2)]",
  },
  {
    icon: BookOpen,
    title: "個人化學習",
    lines: ["量身打造學習計畫", "提升學習效率"],
    accent: "from-violet-400/20 to-indigo-600/5",
    border: "border-violet-400/25 hover:border-violet-400/50 hover:shadow-[0_0_32px_rgba(139,92,246,0.2)]",
  },
  {
    icon: BarChart3,
    title: "智慧追蹤",
    lines: ["學習歷程追蹤", "成長看得見"],
    accent: "from-blue-400/20 to-blue-600/5",
    border: "border-blue-400/25 hover:border-blue-400/50 hover:shadow-[0_0_32px_rgba(59,130,246,0.2)]",
  },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function HeroSection({ announcement }: { announcement: HomeAnnouncementPayload }) {
  const reduceMotion = useReducedMotion();
  const [announceOpen, setAnnounceOpen] = useState(false);

  return (
    <section className="relative min-h-[100dvh] overflow-hidden text-slate-100">
      <HeroBackground />
      <HeroDecorations />

      {/* Glass header */}
      <motion.header
        className="relative z-20 border-b border-white/10 bg-slate-950/40 backdrop-blur-xl"
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
            <Image
              src="/mingguan-logo.png"
              alt="名貫補習班"
              width={200}
              height={56}
              className="h-10 w-auto object-contain sm:h-11"
              priority
            />
            <span className="hidden text-sm font-semibold tracking-wide text-slate-200 sm:inline">
              名貫補習班
            </span>
          </Link>
          <Button variant="glass" size="default" type="button" onClick={() => setAnnounceOpen(true)}>
            <Megaphone className="h-4 w-4 text-cyan-300" aria-hidden />
            系統公告
          </Button>
        </div>
      </motion.header>

      {/* Hero content */}
      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-center px-4 pb-16 pt-10 text-center sm:px-6 sm:pt-14 md:pb-20">
        <motion.p
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium tracking-wide text-cyan-200/90 sm:text-sm"
        >
          國中理化
        </motion.p>

        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 max-w-4xl"
        >
          <h1 className="flex flex-col items-center leading-none">
            <span className="hero-title-glow text-[clamp(4.5rem,18vw,9rem)] font-black tracking-tighter text-white">
              AI
            </span>
            <span className="mt-1 text-[clamp(1.75rem,6vw,3.25rem)] font-bold tracking-tight text-white/95">
              智慧學習
            </span>
            <span className="hero-gradient-text mt-1 text-[clamp(2rem,7vw,4rem)] font-extrabold tracking-tight">
              測試系統
            </span>
          </h1>
        </motion.div>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-6 text-base font-medium tracking-wide text-cyan-100/90 sm:text-lg md:text-xl"
        >
          精準診斷 × 個人化學習 × 智慧追蹤
        </motion.p>

        <motion.p
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-5 max-w-2xl text-pretty text-sm leading-relaxed text-slate-300/90 sm:text-base md:text-lg"
        >
          結合 AI 技術，精準分析學習弱點，
          <br className="hidden sm:inline" />
          量身打造專屬學習計畫，
          <br className="hidden sm:inline" />
          讓每一次練習都更有效率。
        </motion.p>

        {/* Feature cards */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5"
        >
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.1, duration: 0.45 }}
                whileHover={reduceMotion ? undefined : { scale: 1.03, y: -4 }}
                className={cn(
                  "group rounded-2xl border bg-gradient-to-b p-5 text-left backdrop-blur-md transition-shadow duration-300",
                  f.accent,
                  f.border,
                )}
              >
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner">
                  <Icon className="h-5 w-5 text-cyan-300 transition-colors group-hover:text-cyan-200" />
                </div>
                <p className="text-base font-semibold text-white">{f.title}</p>
                {f.lines.map((line) => (
                  <p key={line} className="mt-1 text-sm text-slate-400">
                    {line}
                  </p>
                ))}
              </motion.div>
            );
          })}
        </motion.div>

        {/* CTA */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-12 flex w-full max-w-2xl flex-col gap-4 sm:flex-row sm:justify-center sm:gap-6"
        >
          <motion.div
            className="w-full sm:w-auto"
            whileHover={reduceMotion ? undefined : { y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <Link href="/login" className="block w-full">
              <Button variant="student" size="xl" className="w-full sm:min-w-[280px]">
                <GraduationCap className="h-6 w-6 shrink-0" aria-hidden />
                <span className="flex flex-col items-center gap-0.5">
                  <span>學生登入</span>
                  <span className="text-xs font-normal opacity-90">開始學習測驗</span>
                </span>
              </Button>
            </Link>
          </motion.div>
          <motion.div
            className="w-full sm:w-auto"
            whileHover={reduceMotion ? undefined : { y: -6, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
          >
            <Link href="/admin/login" className="block w-full">
              <Button variant="teacher" size="xl" className="w-full sm:min-w-[280px]">
                <UserRound className="h-6 w-6 shrink-0" aria-hidden />
                <span className="flex flex-col items-center gap-0.5">
                  <span>老師登入</span>
                  <span className="text-xs font-normal opacity-90">查看班級數據</span>
                </span>
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        <motion.p
          custom={6}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mt-8 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm"
        >
          家長可陪同學生登入，平台協助追蹤學習與診斷結果。
        </motion.p>
      </div>

      {/* Announcement modal */}
      {announceOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announce-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-500/30 bg-slate-900/95 p-6 shadow-[0_0_60px_rgba(34,211,238,0.15)] backdrop-blur-xl"
          >
            <button
              type="button"
              onClick={() => setAnnounceOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="關閉"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="announce-title" className="text-lg font-semibold text-cyan-100">
              {announcement.title}
            </h2>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-300">
              {announcement.items.map((line, i) => (
                <li key={`${i}-${line.slice(0, 24)}`}>{line}</li>
              ))}
            </ul>
            <Button variant="glass" className="mt-6 w-full" type="button" onClick={() => setAnnounceOpen(false)}>
              我知道了
            </Button>
          </motion.div>
        </div>
      ) : null}
    </section>
  );
}
