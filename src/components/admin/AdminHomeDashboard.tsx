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
  Mail,
  Megaphone,
  Settings,
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
import { adminTopHeader, adminTopHeaderInner } from "@/lib/admin-ui";
import { cn } from "@/lib/utils";

type MainFeature = {
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: LucideIcon;
  accent: string;
  hoverShadow: string;
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
    accent: "from-cyan-50/90 via-white to-sky-50/40",
    hoverShadow: "hover:shadow-[0_12px_40px_-12px_rgba(6,182,212,0.22)]",
    border: "border-cyan-200/70 hover:border-cyan-300/90",
  },
  {
    title: "學習任務設定",
    description: "指派影片任務、設定期限、追蹤完成狀況",
    cta: "建立學習任務",
    href: "/admin/tasks",
    icon: ClipboardList,
    accent: "from-violet-50/80 via-white to-indigo-50/30",
    hoverShadow: "hover:shadow-[0_12px_40px_-12px_rgba(139,92,246,0.15)]",
    border: "border-violet-200/70 hover:border-violet-300/90",
  },
  {
    title: "AI 題目與影片管理",
    description: "管理影片、產生題目、審核題目與技能標籤",
    cta: "進入管理中心",
    href: "/admin/videos",
    icon: Sparkles,
    accent: "from-sky-50/90 via-white to-blue-50/40",
    hoverShadow: "hover:shadow-[0_12px_40px_-12px_rgba(59,130,246,0.18)]",
    border: "border-sky-200/70 hover:border-sky-300/90",
  },
];

const SHORTCUTS: Shortcut[] = [
  { label: "首頁系統公告", href: "/admin/announcement", icon: Megaphone },
  { label: "學生名單管理", href: "/admin/students", icon: Users },
  { label: "每日報表設定", href: "/admin/report-settings", icon: Settings },
  { label: "家長摘要預覽", href: "/admin/reports/parent-preview", icon: Mail },
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
    <div className="relative min-h-[100dvh]">
      <header className={adminTopHeader}>
        <div className={adminTopHeaderInner}>
          <div className="flex flex-wrap items-center gap-3">
            <HomeBackLink href="/" variant="admin">
              回到官網
            </HomeBackLink>
            <span className="hidden h-6 w-px bg-cyan-200/70 sm:block" aria-hidden />
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <p className="text-xs font-medium uppercase tracking-widest text-cyan-600/90">老師後台</p>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">AI 智慧學習管理</h1>
            </motion.div>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">每日最常用的操作，一目了然</p>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 py-8 text-slate-800 sm:px-6 sm:py-10">
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
                      "group relative flex min-h-[220px] flex-col overflow-hidden rounded-2xl border bg-white p-6 shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] transition-all duration-300 sm:min-h-[240px] sm:p-7",
                      feature.border,
                      feature.hoverShadow,
                    )}
                  >
                    <div
                      className={cn(
                        "pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br opacity-70",
                        feature.accent,
                      )}
                      aria-hidden
                    />
                    <motion.div
                      className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/80 bg-cyan-50/90 shadow-inner"
                      whileHover={reduceMotion ? undefined : { scale: 1.05 }}
                    >
                      <Icon className="h-7 w-7 text-cyan-700" strokeWidth={1.75} />
                    </motion.div>
                    <h3 className="relative text-xl font-bold text-slate-900">{feature.title}</h3>
                    <p className="relative mt-2 flex-1 text-sm leading-relaxed text-slate-600">
                      {feature.description}
                    </p>
                    <span className="relative mt-6 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 transition-colors group-hover:text-cyan-800">
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
            <h2 className="text-sm font-semibold tracking-wide text-slate-700">常用捷徑</h2>
            <span className="h-px flex-1 bg-gradient-to-r from-cyan-200/60 to-transparent" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {SHORTCUTS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex items-center gap-3 rounded-xl border border-cyan-200/55 bg-white px-3 py-3.5 shadow-sm transition-all hover:border-cyan-300/90 hover:shadow-[0_8px_24px_-10px_rgba(14,165,233,0.18)] sm:px-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-200/70 bg-cyan-50/90 text-cyan-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-medium leading-snug text-slate-700 group-hover:text-slate-900 sm:text-sm">
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
            className="rounded-2xl border border-cyan-200/55 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.1)]"
          >
            <CollapsibleTrigger
              aria-label={advancedOpen ? "收合進階工具清單" : "展開進階工具清單"}
              className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-4 text-left transition-colors hover:bg-cyan-50/50 focus-visible:bg-cyan-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-400/50 sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200/70 bg-cyan-50/80 text-cyan-800">
                  <Wrench className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">進階工具</p>
                  <p className="text-xs text-slate-500">段考產題、技能對應等較少使用的功能</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3" aria-hidden>
                <span className="hidden text-xs font-semibold text-cyan-800 sm:inline">
                  {advancedOpen ? "點擊收合" : "點擊展開"}
                </span>
                <span className="rounded-full border-2 border-cyan-300/80 bg-cyan-50 px-2 py-1 text-[11px] font-bold leading-none text-cyan-900 shadow-sm sm:hidden">
                  {advancedOpen ? "收合" : "展開"}
                </span>
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-cyan-400/70 bg-white text-cyan-700 shadow-sm transition-[transform,box-shadow] group-hover:shadow-md"
                >
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      advancedOpen && "rotate-180",
                    )}
                  />
                </span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-cyan-100 px-3 pb-3 sm:px-4 sm:pb-4">
              <ul className="divide-y divide-cyan-100/80">
                {ADVANCED_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <li key={tool.href}>
                      <Link
                        href={tool.href}
                        className="group flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-cyan-50/50 sm:px-3"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-cyan-700" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 group-hover:text-cyan-900">
                            {tool.label}
                          </p>
                          <p className="truncate text-xs text-slate-500">{tool.description}</p>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:text-cyan-600 group-hover:opacity-100" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </CollapsibleContent>
          </Collapsible>
        </motion.section>

        <p className="mt-10 text-center text-xs text-slate-500">
          登入網址：<span className="font-mono text-slate-600">/admin/login</span>
          <span className="mx-2 text-slate-400">·</span>
          <Link
            href="/admin/reports"
            className="text-slate-600 underline-offset-2 hover:text-cyan-700 hover:underline"
          >
            學習分析圖表
          </Link>
        </p>
      </main>
    </div>
  );
}
