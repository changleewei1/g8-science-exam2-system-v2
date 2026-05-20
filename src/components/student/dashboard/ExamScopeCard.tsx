"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Lock, Play } from "lucide-react";
import type { ExamCard } from "@/lib/student-dashboard-types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  card: ExamCard;
  index?: number;
};

function AnimatedProgress({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <motion.div
      className="mt-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <motion.div
        className="mb-1 flex justify-between text-[11px] text-slate-400"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <span>完成度</span>
        <span className="font-medium text-cyan-200/90">{pct}%</span>
      </motion.div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800/80">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 shadow-[0_0_12px_rgba(34,211,238,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
        />
      </div>
    </motion.div>
  );
}

export function ExamScopeCard({ card, index = 0 }: Props) {
  const title = `${card.grade}理化 · ${card.semester}${card.exam}`;
  const learnHref = `/student/exam-scope/${card.id}`;

  if (!card.isOpen) {
    return (
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-24px" }}
        transition={{ duration: 0.4, delay: index * 0.06 }}
        className={cn(
          "relative flex h-full min-h-[220px] flex-col rounded-2xl border border-slate-700/60",
          "bg-slate-900/40 p-4 opacity-75 grayscale sm:p-5",
        )}
      >
        <motion.div
          className="absolute right-4 top-4 text-slate-500"
          animate={{ opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <Lock className="h-5 w-5" aria-hidden />
        </motion.div>
        <p className="pr-8 text-sm font-semibold text-slate-500">{title}</p>
        <p className="mt-1 text-xs text-slate-600">{card.subject}</p>
        <div className="mt-auto pt-6">
          <p className="text-sm font-medium text-slate-500">尚未開放</p>
          <p className="mt-1 text-xs text-slate-600">請等待老師開啟</p>
          <Button
            variant="ghost"
            disabled
            className="mt-4 w-full cursor-not-allowed border border-slate-700/80 bg-slate-800/50 text-slate-500"
          >
            準備中
          </Button>
        </div>
      </motion.article>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-24px" }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -6, scale: 1.02 }}
      className={cn(
        "group relative flex h-full min-h-[260px] flex-col overflow-hidden rounded-2xl p-[1px]",
        "bg-gradient-to-br from-cyan-400/50 via-blue-500/30 to-violet-500/30",
        "shadow-[0_0_32px_rgba(34,211,238,0.12)] transition-shadow duration-300",
        "hover:shadow-[0_0_48px_rgba(34,211,238,0.28)]",
      )}
    >
      <div className="relative flex h-full flex-col rounded-2xl border border-cyan-400/10 bg-slate-900/85 p-4 backdrop-blur-md sm:p-5">
        <motion.div
          className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-cyan-400/15 blur-2xl"
          animate={{ opacity: [0.3, 0.55, 0.3] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <div className="relative">
          <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
            已開放
          </span>
          <h3 className="mt-2 text-base font-bold text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-400">{card.subject}</p>
        </div>

        {card.units.length > 0 ? (
          <p className="relative mt-3 line-clamp-2 text-xs leading-relaxed text-slate-300">
            涵蓋單元：{card.units.join("、")}
          </p>
        ) : (
          <p className="relative mt-3 text-xs text-slate-500">單元資料準備中</p>
        )}

        <AnimatedProgress value={card.completionRate} />

        <dl className="relative mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <motion.div
            className="rounded-lg border border-white/5 bg-white/5 px-2 py-1.5"
            whileHover={{ borderColor: "rgba(34,211,238,0.3)" }}
          >
            <dt className="text-slate-500">技能完成</dt>
            <dd className="font-semibold text-white">
              {card.masteredSkills}
              <span className="text-slate-500"> / {card.totalSkills || "—"}</span>
            </dd>
          </motion.div>
          <motion.div
            className="rounded-lg border border-white/5 bg-white/5 px-2 py-1.5"
            whileHover={{ borderColor: "rgba(34,211,238,0.3)" }}
          >
            <dt className="text-slate-500">AI 熟練度</dt>
            <dd className="font-semibold text-cyan-200">{card.averageMastery}%</dd>
          </motion.div>
        </dl>

        <div className="relative mt-auto pt-4">
          <Link href={learnHref} className="block">
            <Button variant="student" size="default" className="w-full gap-2">
              <Play className="h-4 w-4 fill-current" aria-hidden />
              開始學習
            </Button>
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
