"use client";

import Link from "next/link";
import { useId } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import type { StudentFocusHomePayload } from "@/lib/student-dashboard-types";
import { cn } from "@/lib/utils";

type Props = {
  data: StudentFocusHomePayload;
};

function GlassStatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white/65 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,118,110,0.08)] backdrop-blur-md sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-[1.65rem]">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{hint}</p> : null}
    </div>
  );
}

function MissionStatChip({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-[5rem] flex-col rounded-xl border border-slate-200/90 bg-white/50 px-3 py-2 text-center backdrop-blur-sm">
      <span className="text-base font-semibold tabular-nums text-slate-900">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
    </div>
  );
}

function BigProgressRing({
  percent,
  gradientId,
}: {
  percent: number;
  gradientId: string;
}) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const p = Math.min(100, Math.max(0, percent));
  const dash = (p / 100) * c;
  return (
    <svg
      viewBox="0 0 128 128"
      className="h-40 w-40 shrink-0 sm:h-48 sm:w-48"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
      </defs>
      <circle cx="64" cy="64" r={r} fill="none" className="stroke-slate-200" strokeWidth="9" />
      <circle
        cx="64"
        cy="64"
        r={r}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform="rotate(-90 64 64)"
        className="transition-[stroke-dasharray] duration-700 ease-out"
      />
    </svg>
  );
}

export function StudentFocusHome({ data }: Props) {
  const {
    studentName,
    weeklyLearningLabel,
    weeklyLearningMinutes,
    taskSummary,
    questionUpdate,
    activeScope,
    nextStepHint,
  } = data;
  const ringGradId = `home-ring-${useId().replace(/:/g, "")}`;

  const scopeHref = activeScope ? `/student/exam-scope/${activeScope.id}` : null;
  const tasksHref = "/student/tasks";

  const incomplete = taskSummary.incompleteTaskCount;
  const newCount = taskSummary.newTaskCount;
  const todayNew = taskSummary.todayNewTaskCount;
  const hasIncomplete = incomplete > 0;
  const hasNew = taskSummary.hasNewTasks;
  const allDoneThisWeek = !hasIncomplete && taskSummary.completedTaskCount > 0;

  const primaryHref = hasIncomplete ? tasksHref : scopeHref ?? tasksHref;
  const primaryLabel = hasNew
    ? "開始本週任務"
    : hasIncomplete
      ? "繼續本週任務"
      : "開始學習";

  const primarySub =
    hasIncomplete && scopeHref
      ? "完成任務後，再進段考預習會更順。"
      : hasIncomplete
        ? "完成任務可讓學習診斷更貼近你的弱點。"
        : "依單元觀看影片並完成智慧練習。";

  const completion = activeScope?.completionRate ?? 0;
  const videoPct = activeScope?.videoCompletionRate ?? null;
  const skillPct = activeScope?.skillCompletionRate ?? null;
  const quizPct = activeScope?.quizPassRate ?? null;
  const mastered = activeScope?.masteredSkills ?? 0;
  const totalSk = activeScope?.totalSkills ?? 0;

  const weeklyHint =
    weeklyLearningMinutes <= 0
      ? "含影片觀看與智慧練習估算"
      : `約 ${weeklyLearningMinutes} 分鐘 · 含影片與練習估算`;

  return (
    <div className="relative min-h-[calc(100dvh-4rem)]">
      {/* 背景：淺底＋網格＋柔和青綠光暈 */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[#F8FAFC]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.11) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.11) 1px, transparent 1px)
          `,
          backgroundSize: "44px 44px",
        }}
      />
      <div className="pointer-events-none absolute -left-32 top-0 -z-10 h-[min(55vw,420px)] w-[min(55vw,420px)] rounded-full bg-teal-400/12 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-1/3 -z-10 h-[min(50vw,380px)] w-[min(50vw,380px)] rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 -z-10 h-64 w-96 rounded-full bg-sky-300/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-3xl flex-col px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        {/* 第一層：姓名 + 段考範圍 */}
        <header className="mb-10 text-center sm:mb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-700/80">Learning</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{studentName}</h1>
          {activeScope ? (
            <>
              <p className="mx-auto mt-3 max-w-xl text-lg font-medium text-slate-700 sm:text-xl">
                {activeScope.headline}
              </p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">{activeScope.title}</p>
            </>
          ) : (
            <p className="mx-auto mt-4 max-w-md text-sm text-slate-600">目前沒有對應年級的開放段考範圍。</p>
          )}
          <p className="mx-auto mt-5 max-w-lg text-sm leading-relaxed text-slate-500">{nextStepHint}</p>
        </header>

        {/* 第二層：大圓形進度 */}
        <section className="mb-12 flex flex-col items-center sm:mb-14">
          <div className="relative flex flex-col items-center">
            <div className="relative flex h-40 w-40 items-center justify-center sm:h-48 sm:w-48">
              <BigProgressRing percent={completion} gradientId={ringGradId} />
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-semibold tabular-nums text-slate-900 sm:text-4xl">{completion}%</span>
                <span className="mt-0.5 text-xs font-medium text-slate-500">段考整體進度</span>
              </div>
            </div>
            {activeScope ? (
              <p className="mt-4 text-center text-sm text-slate-500">
                技能精熟 {mastered}/{totalSk}
                {activeScope.averageMastery > 0 ? ` · 平均熟練度 ${activeScope.averageMastery}%` : null}
              </p>
            ) : null}
          </div>
        </section>

        {/* 第三層：四張統計卡 */}
        <section className="mb-12 grid grid-cols-2 gap-3 sm:mb-14 sm:grid-cols-2 sm:gap-4">
          <GlassStatCard
            label="影片完成"
            value={videoPct !== null ? `${videoPct}%` : "—"}
            hint={activeScope ? "目前段考範圍內影片" : "選定段考後顯示"}
          />
          <GlassStatCard
            label="技能完成"
            value={skillPct !== null ? `${skillPct}%` : "—"}
            hint={activeScope && totalSk > 0 ? `已精熟 ${mastered} / ${totalSk} 項` : "選定段考後顯示"}
          />
          <GlassStatCard label="本週學習時間" value={weeklyLearningLabel} hint={weeklyHint} />
          <GlassStatCard
            label="測驗通過率"
            value={quizPct !== null ? `${quizPct}%` : "—"}
            hint={activeScope ? "範圍內作答通過比例" : "選定段考後顯示"}
          />
        </section>

        {/* 第四層：本週任務 */}
        {hasIncomplete ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative mb-10 overflow-hidden rounded-3xl border border-slate-200/90 bg-white/55 p-6 shadow-[0_8px_32px_-16px_rgba(15,118,110,0.12)] backdrop-blur-xl sm:p-8"
          >
            <div className="pointer-events-none absolute right-0 top-0 h-32 w-32 rounded-full bg-teal-400/10 blur-2xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4 border-l-4 border-teal-500 pl-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-teal-800/90">本週任務</p>
                <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  <span aria-hidden className="text-lg">
                    ◆
                  </span>
                  尚有進行中的任務
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  共 <span className="font-semibold tabular-nums text-slate-900">{incomplete}</span> 項待完成
                  {newCount > 0 ? (
                    <>
                      ，其中 <span className="font-semibold tabular-nums text-slate-900">{newCount}</span> 項尚未開啟
                    </>
                  ) : null}
                </p>
              </div>
              <Sparkles className="h-7 w-7 shrink-0 text-teal-600/80" aria-hidden />
            </div>

            <div className="relative mt-5 flex flex-wrap gap-2">
              <MissionStatChip label="新任務" value={newCount} />
              <MissionStatChip label="未完成" value={incomplete} />
              <MissionStatChip label="今日新增" value={todayNew} />
            </div>

            <p className="relative mt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              完成任務有助於
            </p>
            <ul className="relative mt-2 space-y-1.5 text-sm text-slate-600">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                技能熟練度
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                學習診斷精準度
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
                段考準備完整度
              </li>
            </ul>

            <Link
              href={tasksHref}
              className="relative mt-6 flex w-full items-center justify-center rounded-2xl bg-slate-900 py-3.5 text-center text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 active:scale-[0.99]"
            >
              前往任務
            </Link>
          </motion.section>
        ) : allDoneThisWeek ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-10 overflow-hidden rounded-3xl border border-emerald-200/90 bg-emerald-50/40 p-6 backdrop-blur-xl sm:p-8"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-emerald-900">
              <span aria-hidden>✓</span> 本週任務已完成
            </h2>
            <p className="mt-2 text-sm text-emerald-900/85">太棒了，繼續保持穩定學習節奏。</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <MissionStatChip label="新任務" value={newCount} />
              <MissionStatChip label="未完成" value={incomplete} />
              <MissionStatChip label="今日新增" value={todayNew} />
            </div>
          </motion.section>
        ) : (
          <div className="mb-10 rounded-3xl border border-slate-200/90 bg-white/50 p-5 text-center text-sm text-slate-600 backdrop-blur-md">
            目前沒有進行中的學習任務。
          </div>
        )}

        {/* 題目已更新（新任務區塊下方） */}
        {questionUpdate && questionUpdate.unreadCount > 0 ? (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative mb-10 overflow-hidden rounded-3xl border border-amber-300/70 bg-gradient-to-br from-amber-50/95 via-white to-orange-50/40 p-6 shadow-[0_12px_40px_-14px_rgba(251,146,60,0.35)] backdrop-blur-xl sm:p-8"
          >
            <div className="pointer-events-none absolute -right-10 top-0 h-36 w-36 rounded-full bg-orange-400/15 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-40 rounded-full bg-cyan-400/10 blur-2xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-4 border-l-4 border-amber-500 pl-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-900/90">
                  Question refresh
                </p>
                <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-2.5 py-0.5 text-sm font-bold text-white shadow-[0_0_16px_rgba(249,115,22,0.45)]">
                    🆕 {questionUpdate.unreadCount}
                  </span>
                  題目已更新
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  有 <span className="font-semibold tabular-nums">{questionUpdate.unreadCount}</span> 題測驗已優化，建議重新挑戰以對齊最新題目與詳解。
                </p>
              </div>
              <Sparkles className="h-7 w-7 shrink-0 text-amber-500/90" aria-hidden />
            </div>
            <div className="relative mt-6">
              <Link
                href={questionUpdate.practiceHref}
                className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3.5 text-center text-sm font-semibold text-white shadow-[0_8px_28px_-8px_rgba(249,115,22,0.55)] transition hover:brightness-105 active:scale-[0.99]"
              >
                立即複習
              </Link>
            </div>
          </motion.section>
        ) : null}

        {/* 第五層：主 CTA */}
        <div className="mt-auto space-y-3 pt-2">
          <Link
            href={primaryHref}
            className={cn(
              "flex w-full items-center justify-center rounded-2xl py-4 text-center text-base font-semibold shadow-lg transition active:scale-[0.99]",
              hasIncomplete
                ? "bg-teal-600 text-white shadow-teal-600/20 hover:bg-teal-700"
                : "bg-slate-900 text-white shadow-slate-900/15 hover:bg-slate-800",
            )}
          >
            {primaryLabel}
          </Link>
          {hasIncomplete && scopeHref ? (
            <Link
              href={scopeHref}
              className="flex w-full items-center justify-center rounded-2xl border border-slate-300/90 bg-white/60 py-3.5 text-sm font-medium text-slate-700 backdrop-blur-sm transition hover:bg-white/90"
            >
              改為進入段考預習
            </Link>
          ) : null}
          <p className="text-center text-xs leading-relaxed text-slate-500">{primarySub}</p>
        </div>
      </div>
    </div>
  );
}
