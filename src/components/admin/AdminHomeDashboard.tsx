"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  ChevronDown,
  ClipboardList,
  FileCheck2,
  GitBranch,
  Layers,
  ListChecks,
  Megaphone,
  Sparkles,
  Tags,
  Users,
  Video,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HomeBackLink } from "@/components/ui/HomeBackLink";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

type MainFeature = {
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  glow: string;
  border: string;
};

type Shortcut = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type AdvancedTool = {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
};

const MAIN_FEATURES: MainFeature[] = [
  {
    title: "學習進度總覽",
    description: "查看全班影片觀看、測驗完成率、弱點統計",
    cta: "查看班級進度",
    href: "/admin/video-tracking",
    icon: BarChart3,
    accent: "from-cyan-400/25 via-cyan-500/10 to-transparent",
    glow: "group-hover:shadow-[0_0_48px_rgba(34,211,238,0.35)]",
    border: "border-cyan-400/30 group-hover:border-cyan-400/55",
  },
  {
    title: "學習任務設定",
    description: "指派影片任務、設定期限、追蹤完成狀況",
    cta: "建立學習任務",
    href: "/admin/tasks",
    icon: ClipboardList,
    accent: "from-violet-400/25 via-indigo-500/10 to-transparent",
    glow: "group-hover:shadow-[0_0_48px_rgba(139,92,246,0.35)]",
    border: "border-violet-400/30 group-hover:border-violet-400/55",
  },
  {
    title: "AI 題目與影片管理",
    description: "管理影片、產生題目、審核題目與技能標籤",
    cta: "進入管理中心",
    href: "/admin/videos",
    icon: Sparkles,
    accent: "from-blue-400/25 via-blue-600/10 to-transparent",
    glow: "group-hover:shadow-[0_0_48px_rgba(59,130,246,0.35)]",
    border: "border-blue-400/30 group-hover:border-blue-400/55",
  },
];

const SHORTCUTS: Shortcut[] = [
  { label: "首頁系統公告", href: "/admin/announcement", icon: Megaphone },
  { label: "學生名單管理", href: "/admin/students", icon: Users },
  { label: "影片測驗題編輯", href: "/admin/video-quizzes", icon: BookOpenCheck },
  { label: "題目候選審核", href: "/admin/question-candidates", icon: FileCheck2 },
  { label: "影片技能候選審核", href: "/admin/video-skill-review", icon: ListChecks },
];

const ADVANCED_TOOLS: AdvancedTool[] = [
  {
    label: "影片技能對應管理",
    description: "手動維護影片與 skill_code 連結",
    href: "/admin/video-skill-tags",
    icon: Tags,
  },
  {
    label: "影片管理中心",
    description: "草稿影片、AI 分析與候選題流程",
    href: "/admin/videos",
    icon: Video,
  },
  {
    label: "第三次段考影片題目狀態",
    description: "字幕、技能、題庫與測驗就緒狀態",
    href: "/admin/video-question-status",
    icon: Layers,
  },
  {
    label: "第三次段考影片理解題產生",
    description: "選影片、檢視字幕，AI 產生候選題",
    href: "/admin/question-generator",
    icon: Sparkles,
  },
  {
    label: "技能樹練習追蹤",
    description: "段考範圍內智慧練習熟練度對照",
    href: "/admin/skill-practice",
    icon: GitBranch,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function AdminHomeDashboard() {
  const reduceMotion = useReducedMotion();
  const [advancedOpen, setAdvancedOpen] = useState(false);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050810] text-slate-100">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,#1e3a5f_0%,#0a0f1f_50%,#050810_100%)]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-cyan-500/15 blur-[100px]"
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute -right-20 top-32 h-72 w-72 rounded-full bg-violet-600/20 blur-[110px]"
        aria-hidden
      />

      <header className="relative border-b border-white/10 bg-slate-950/40 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex flex-wrap items-center gap-3">
            <HomeBackLink />
            <span className="hidden h-6 w-px bg-white/15 sm:block" aria-hidden />
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="text-xs font-medium tracking-widest text-cyan-300/80 uppercase">
                老師後台
              </p>
              <h1 className="text-lg font-bold text-white sm:text-xl">AI 智慧學習管理</h1>
            </motion.div>
          </div>
          <p className="text-xs text-slate-400 sm:text-sm">每日最常用的操作，一目了然</p>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <motion.section
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-10"
        >
          <h2 className="sr-only">主要功能</h2>
          <div className="grid gap-5 lg:grid-cols-3 lg:gap-6">
            {MAIN_FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  custom={i + 1}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                >
                  <Link
                    href={feature.href}
                    className={cn(
                      "group relative flex min-h-[220px] flex-col rounded-2xl border bg-white/5 p-6 backdrop-blur-md transition-all duration-300 sm:min-h-[240px] sm:p-7",
                      feature.border,
                      feature.glow,
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-80",
                        feature.accent,
                      )}
                      aria-hidden
                    />
                    <motion.div
                      className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 shadow-inner"
                      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                    >
                      <Icon className="h-7 w-7 text-cyan-200" strokeWidth={1.75} />
                    </motion.div>
                    <h3 className="relative text-xl font-bold text-white">{feature.title}</h3>
                    <p className="relative mt-2 flex-1 text-sm leading-relaxed text-slate-400">
                      {feature.description}
                    </p>
                    <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition-colors group-hover:text-cyan-200">
                      {feature.cta}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        <motion.section
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-10"
        >
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-wide text-slate-300">常用捷徑</h2>
            <span className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {SHORTCUTS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3.5 backdrop-blur-sm transition-all hover:border-cyan-400/35 hover:bg-white/[0.06] hover:shadow-[0_0_20px_rgba(34,211,238,0.12)] sm:px-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-cyan-300/90 group-hover:text-cyan-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium leading-snug text-slate-300 group-hover:text-white sm:text-sm">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </motion.section>

        <motion.section custom={5} variants={fadeUp} initial="hidden" animate="visible">
          <Collapsible
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-md"
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.04] sm:px-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-400">
                  <Wrench className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">進階工具</p>
                  <p className="text-xs text-slate-500">段考產題、技能對應等較少使用的功能</p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200",
                  advancedOpen && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-white/10 px-3 pb-3 sm:px-4 sm:pb-4">
              <ul className="divide-y divide-white/5">
                {ADVANCED_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li key={tool.href}>
                      <Link
                        href={tool.href}
                        className="group flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.04] sm:px-3"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-violet-300" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-300 group-hover:text-white">
                            {tool.label}
                          </p>
                          <p className="truncate text-xs text-slate-500">{tool.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-violet-300 group-hover:opacity-100" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </motion.section>

        <p className="mt-10 text-center text-xs text-slate-400">
          登入網址：<span className="font-mono text-slate-500">/admin/login</span>
          <span className="mx-2 text-slate-300">·</span>
          <Link href="/admin/reports" className="text-slate-500 underline-offset-2 hover:text-cyan-400/90 hover:underline">
            學習分析圖表
          </Link>
        </p>
      </main>
    </div>
  );
}
