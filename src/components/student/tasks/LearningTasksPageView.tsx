"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarRange, CheckCircle2, Circle, ListTodo, Play } from "lucide-react";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { buildVideoPageQuery } from "@/lib/student-video-context";
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
};

type Props = {
  tasks: LearningTaskPageTask[];
};

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

export function LearningTasksPageView({ tasks }: Props) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-cyan-200/60 bg-white/75 p-4 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.2)] backdrop-blur-xl sm:p-5"
      >
        <StudentBackLink href="/student/dashboard#exam-scopes">返回學習總覽</StudentBackLink>
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
              依老師指派的日程觀看指定影片，完成後進度會自動更新。
            </p>
          </div>
        </div>
      </motion.section>

      {tasks.length === 0 ? (
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
        <ul className="space-y-6">
          {tasks.map((task, taskIndex) => (
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
              <div className="flex flex-col gap-4 border-b border-cyan-100/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{task.title}</h2>
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
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    完成 {task.completedCount}/{task.totalVideos}
                    <span className="ml-1 text-cyan-800">（{task.completionRate}%）</span>
                  </p>
                  <TaskCompletionBar rate={task.completionRate} />
                </div>
              </div>

              <div className="mt-5 space-y-5">
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
            </motion.li>
          ))}
        </ul>
      )}

      {tasks.length > 0 ? (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-sky-200/70 bg-sky-50/90 p-4 text-sm font-medium leading-relaxed text-slate-800 shadow-sm backdrop-blur-sm sm:p-5"
        >
          完成觀看後，任務卡片上的進度會更新；若從測驗返回，可使用網址上的任務錨點自動捲動到對應任務。
        </motion.section>
      ) : null}
    </div>
  );
}
