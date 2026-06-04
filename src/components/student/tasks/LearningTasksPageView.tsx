"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarRange, CheckCircle2, ChevronDown, Circle, ListTodo, Play, Sparkles } from "lucide-react";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { buildVideoPageQuery } from "@/lib/student-video-context";
import type { StudentQuestionUpdateListItem } from "@/lib/student-question-update-notifications";
import { studentTasksTodayYmd, taskInEffectiveWindow } from "@/lib/student/partition-learning-tasks";
import { cn } from "@/lib/utils";

const phaseLabel: Record<string, string> = {
  upcoming: "即將開始",
  active: "進行中",
  ended: "已結束",
};

export type LearningTaskPageTask = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  className: string;
  phase: "upcoming" | "active" | "ended";
  days: Array<{
    dayIndex: number;
    videos: Array<{
      videoId: string;
      title: string;
      isCompleted: boolean;
      completedAt: string | null;
    }>;
  }>;
  completedCount: number;
  totalVideos: number;
  completionRate: number;
  quizzesPassed: number;
  quizzesTotal: number;
  taskOpenedAt: string | null;
  taskCreatedAt?: string;
};

type Props = {
  newTasks: LearningTaskPageTask[];
  inProgressTasks: LearningTaskPageTask[];
  completedTasks: LearningTaskPageTask[];
  questionUpdates?: StudentQuestionUpdateListItem[];
};

/** 今日在 startDate～endDate（含）內的任務預設展開，其餘預設收合 */
function buildInitialOpenByDeadline(tasks: LearningTaskPageTask[], todayYmd: string): Record<string, boolean> {
  return Object.fromEntries(
    tasks.map((t) => [t.id, taskInEffectiveWindow(t.startDate, t.endDate, todayYmd)]),
  );
}

function phaseBadgeClass(phase: string): string {
  if (phase === "active") return "border-emerald-300/80 bg-emerald-50 text-emerald-900";
  if (phase === "upcoming") return "border-sky-300/80 bg-sky-50 text-sky-900";
  return "border-slate-300/80 bg-slate-100 text-slate-700";
}

function TaskCompletionBar({ rate }: { rate: number }) {
  const pct = Math.min(100, Math.max(0, rate));
  return (
    <div className="mt-3 w-full min-w-[140px] max-w-xs sm:ml-auto">
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
        <span>任務進度</span>
        <span className="text-cyan-800">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-200/50">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function TaskDayVideoList({ task }: { task: LearningTaskPageTask }) {
  return (
    <div className="space-y-5">
      {task.days.map((day) => (
        <div key={day.dayIndex}>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-cyan-900/90">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_#06b6d4]" />
            第 {day.dayIndex} 天
          </h3>
          <ul className="space-y-2">
            {day.videos.map((v) => (
              <li
                key={v.videoId}
                className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-800">
                  {v.title}
                </span>
                <span className="flex shrink-0 flex-wrap items-center gap-3">
                  {v.isCompleted ? (
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" aria-hidden />
                      已觀看完畢
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-500">
                      <Circle className="h-4 w-4 text-slate-400" aria-hidden />
                      未完成
                    </span>
                  )}
                  <Link
                    href={`/student/video/${v.videoId}${buildVideoPageQuery({
                      fromTask: true,
                      taskId: task.id,
                    })}`}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-4 text-sm font-semibold text-white shadow-[0_4px_16px_-4px_rgba(8,145,178,0.45)] transition hover:brightness-105"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden />
                    前往觀看
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function TaskCard({
  task,
  taskIndex,
  badge,
  detailsOpen,
  onDetailsOpenChange,
}: {
  task: LearningTaskPageTask;
  taskIndex: number;
  badge?: string;
  detailsOpen: boolean;
  onDetailsOpenChange: (open: boolean) => void;
}) {
  return (
    <motion.li
      key={task.id}
      id={`learning-task-${task.id}`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 * taskIndex, duration: 0.4 }}
      whileHover={{ y: -2, scale: 1.005 }}
      className={cn(
        "scroll-mt-24 rounded-3xl border border-cyan-200/60 bg-white/85 p-5 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.18)] backdrop-blur-md transition",
        "hover:border-cyan-300 hover:shadow-[0_12px_40px_-8px_rgba(34,211,238,0.22)] sm:p-6",
      )}
    >
      <Collapsible open={detailsOpen} onOpenChange={onDetailsOpenChange} className="w-full">
        <CollapsibleTrigger className="group w-full rounded-2xl text-left outline-none ring-cyan-400/0 transition hover:bg-cyan-50/25 focus-visible:ring-2 focus-visible:ring-cyan-400/80">
          <div className="flex flex-col gap-4 border-b border-cyan-100/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 pr-1">
                <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{task.title}</h2>
                {badge ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/80 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-900">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden />
                    {badge}
                  </span>
                ) : null}
                <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-500 sm:ml-2">
                  <span className="inline group-data-[state=open]:hidden sm:hidden">點標題展開</span>
                  <span className="hidden group-data-[state=open]:inline sm:hidden text-cyan-700">點標題收合</span>
                  <span className="hidden sm:inline group-data-[state=open]:hidden">點選展開</span>
                  <span className="hidden sm:inline group-data-[state=closed]:hidden text-cyan-700">已展開</span>
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-cyan-600 transition-transform duration-200 group-data-[state=open]:rotate-180"
                    aria-hidden
                  />
                </span>
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>
                  {task.startDate} — {task.endDate}
                </span>
                <span
                  className={cn(
                    "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold",
                    phaseBadgeClass(task.phase),
                  )}
                >
                  {phaseLabel[task.phase] ?? task.phase}
                </span>
              </p>
              {task.description ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{task.description}</p>
              ) : null}
              <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-500">影片進度</dt>
                  <dd className="font-semibold text-slate-800">
                    已完成 {task.completedCount} / {task.totalVideos} 支
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">測驗通過</dt>
                  <dd className="font-semibold text-slate-800">
                    {task.quizzesTotal === 0
                      ? "尚無測驗"
                      : `${task.quizzesPassed} / ${task.quizzesTotal} 題組通過`}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="text-sm font-semibold text-slate-800">
                完成 {task.completedCount}/{task.totalVideos}
                <span className="ml-1 text-cyan-800">（{task.completionRate}%）</span>
              </p>
              <TaskCompletionBar rate={task.completionRate} />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="mt-5">
          <TaskDayVideoList task={task} />
        </CollapsibleContent>
      </Collapsible>
    </motion.li>
  );
}

function formatYmd(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("zh-TW", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function QuestionUpdatesSection({ items }: { items: StudentQuestionUpdateListItem[] }) {
  const pending = items.filter((x) => !x.isRead);
  if (pending.length === 0) return null;
  return (
    <motion.section
      id="question-updates"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 }}
      className="relative overflow-hidden rounded-3xl border border-amber-300/70 bg-gradient-to-br from-amber-50/95 via-white to-orange-50/35 p-5 shadow-[0_12px_44px_-14px_rgba(251,146,60,0.38)] backdrop-blur-xl sm:p-7"
    >
      <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-orange-400/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/4 h-24 w-40 rounded-full bg-cyan-400/10 blur-2xl" />
      <div className="relative mb-5 flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow-[0_0_18px_rgba(251,146,60,0.45)]">
          🆕 題目已更新
        </span>
        <p className="text-sm font-semibold text-amber-950/90">老師已優化影片測驗，建議重新挑戰。</p>
      </div>
      <ul className="relative space-y-4">
        {pending.map((u) => {
          const href = u.quizId
            ? `/student/quiz/${u.quizId}`
            : u.videoId
              ? `/student/video/${u.videoId}`
              : "/student/dashboard";
          return (
            <li
              key={u.notificationId}
              className="rounded-2xl border border-amber-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm"
            >
              <p className="text-base font-semibold text-slate-900">{u.videoTitle}</p>
              <dl className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-500">原版本</dt>
                  <dd className="font-mono font-semibold text-slate-800">v{u.oldVersion}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">目前版本</dt>
                  <dd className="font-mono font-semibold text-slate-800">v{u.currentVersion}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">更新時間</dt>
                  <dd className="font-semibold text-slate-800">{formatYmd(u.bankUpdatedAt ?? u.createdAt)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-slate-500">更新原因</dt>
                  <dd className="text-sm leading-relaxed text-slate-800">{u.changeReason ?? "題目內容已更新"}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <Link
                  href={href}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-sm font-semibold text-white shadow-[0_8px_26px_-8px_rgba(249,115,22,0.55)] transition hover:brightness-105 active:scale-[0.99] sm:w-auto sm:min-w-[140px] sm:px-6"
                >
                  重新挑戰
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.section>
  );
}

function TaskSection({
  title,
  tasks,
  badge,
  startIndex,
  openByTaskId,
  onTaskOpenChange,
}: {
  title: string;
  tasks: LearningTaskPageTask[];
  badge?: string;
  startIndex: number;
  openByTaskId: Record<string, boolean>;
  onTaskOpenChange: (taskId: string, open: boolean) => void;
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-cyan-900">{title}</h2>
      <ul className="space-y-6">
        {tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            taskIndex={startIndex + i}
            badge={badge}
            detailsOpen={openByTaskId[task.id] ?? false}
            onDetailsOpenChange={(open) => onTaskOpenChange(task.id, open)}
          />
        ))}
      </ul>
    </section>
  );
}

export function LearningTasksPageView({
  newTasks,
  inProgressTasks,
  completedTasks,
  questionUpdates = [],
}: Props) {
  const router = useRouter();
  const newIds = useMemo(() => newTasks.map((t) => t.id).join(","), [newTasks]);

  const [openByTaskId, setOpenByTaskId] = useState<Record<string, boolean>>(() => {
    const all = [...newTasks, ...inProgressTasks, ...completedTasks];
    const today = studentTasksTodayYmd();
    return buildInitialOpenByDeadline(all, today);
  });

  const onTaskOpenChange = useCallback((taskId: string, open: boolean) => {
    setOpenByTaskId((prev) => ({ ...prev, [taskId]: open }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#question-updates") {
      const el = document.getElementById("question-updates");
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    }
  }, []);

  useEffect(() => {
    if (newTasks.length === 0) return;
    let cancelled = false;
    void (async () => {
      await Promise.all(
        newTasks.map((t) =>
          fetch("/api/student/tasks/mark-opened", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId: t.id }),
          }),
        ),
      );
      if (!cancelled) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [newIds, router]);

  const totalCount = newTasks.length + inProgressTasks.length + completedTasks.length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-cyan-200/60 bg-white/75 p-4 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.2)] backdrop-blur-xl sm:p-5"
      >
        <StudentBackLink href="/student/dashboard">返回學習總覽</StudentBackLink>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-3xl border border-cyan-200/60 bg-white/80 p-5 shadow-[0_8px_40px_-12px_rgba(14,165,233,0.22)] backdrop-blur-xl sm:p-7"
      >
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-700 shadow-inner">
            <ListTodo className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">學習任務（影片預習）</h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <CalendarRange className="h-4 w-4 shrink-0 text-cyan-600" aria-hidden />
              新任務在上方。預設展開「今日仍在任務期限內」的任務；已結束或尚未開始的任務會先收合。點任務標題列可展開／收合每日影片。完成觀看後進度會自動更新。
            </p>
          </div>
        </div>
      </motion.section>

      <QuestionUpdatesSection items={questionUpdates} />

      {totalCount === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-slate-200/90 bg-white/85 p-8 text-center shadow-lg backdrop-blur-sm sm:p-10"
        >
          <ListTodo className="mx-auto mb-3 h-10 w-10 text-cyan-500" aria-hidden />
          <p className="font-semibold text-slate-900">目前沒有指派給你班級的任務</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            或帳號未設定班級。請聯絡老師確認。
          </p>
        </motion.div>
      ) : (
        <div className="space-y-10">
          <TaskSection
            title="新任務"
            tasks={newTasks}
            badge="NEW"
            startIndex={0}
            openByTaskId={openByTaskId}
            onTaskOpenChange={onTaskOpenChange}
          />
          <TaskSection
            title="進行中任務"
            tasks={inProgressTasks}
            startIndex={newTasks.length}
            openByTaskId={openByTaskId}
            onTaskOpenChange={onTaskOpenChange}
          />
          <TaskSection
            title="已完成任務"
            tasks={completedTasks}
            startIndex={newTasks.length + inProgressTasks.length}
            openByTaskId={openByTaskId}
            onTaskOpenChange={onTaskOpenChange}
          />
        </div>
      )}

      {totalCount > 0 ? (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-sky-200/70 bg-sky-50/90 p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm backdrop-blur-sm sm:p-5"
        >
          進入本頁後，系統會將「新任務」標記為已讀；儀表板上的提示會更新。預設展開期限內的任務；期限外可點標題列展開。若從測驗返回，可使用網址錨點捲動到對應任務（仍須點標題列展開）。
        </motion.section>
      ) : null}
    </div>
  );
}
