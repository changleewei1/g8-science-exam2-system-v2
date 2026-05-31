"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

type Summary = {
  newTaskCount: number;
  incompleteTaskCount: number;
  completedTaskCount: number;
  hasNewTasks: boolean;
  todayNewTaskCount: number;
};

export function LearningTasksDashboardCard() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/student/tasks/summary", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setErr(typeof data.error === "string" ? data.error : "無法載入");
          return;
        }
        setSummary({
          newTaskCount: Number(data.newTaskCount) || 0,
          incompleteTaskCount: Number(data.incompleteTaskCount) || 0,
          completedTaskCount: Number(data.completedTaskCount) || 0,
          hasNewTasks: Boolean(data.hasNewTasks),
          todayNewTaskCount: Number(data.todayNewTaskCount) || 0,
        });
      } catch {
        setErr("無法載入");
      }
    })();
  }, []);

  const glow = summary?.hasNewTasks;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.08 }}
      className={cn(
        "mt-8 rounded-3xl border bg-white/95 p-5 shadow-sm backdrop-blur-sm sm:p-6",
        glow
          ? "border-amber-400/70 shadow-[0_0_28px_-6px_rgba(251,191,36,0.55)] ring-2 ring-amber-400/30"
          : "border-slate-200/90",
      )}
      aria-labelledby="learning-tasks-card-heading"
    >
      <div className="flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-slate-700 shadow-inner",
            glow ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50",
          )}
        >
          <ListTodo className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="learning-tasks-card-heading" className="text-base font-bold text-slate-900">
            學習任務
          </h2>
          {err ? (
            <p className="mt-2 text-sm text-red-600">{err}</p>
          ) : summary ? (
            <div className="mt-2 space-y-2">
              {summary.hasNewTasks ? (
                <p className="text-lg font-bold text-amber-700">🔥 新任務</p>
              ) : null}
              {summary.incompleteTaskCount > 0 ? (
                <p className="text-sm font-medium text-slate-700">
                  尚有 {summary.incompleteTaskCount} 個任務{summary.hasNewTasks ? "待完成" : "未完成"}
                </p>
              ) : summary.completedTaskCount > 0 ? (
                <p className="text-sm font-semibold text-emerald-700">✅ 今日任務已完成</p>
              ) : (
                <p className="text-sm text-slate-600">目前沒有進行中的任務。</p>
              )}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">載入中…</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/student/tasks"
          className={cn(
            "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-semibold shadow-md transition sm:flex-none sm:px-6",
            glow
              ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-105"
              : "bg-slate-900 text-white hover:bg-slate-800",
          )}
        >
          {summary?.hasNewTasks ? "立即查看任務" : "查看學習任務"}
        </Link>
      </div>
    </motion.section>
  );
}
