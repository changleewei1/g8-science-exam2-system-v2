"use client";

import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  accent?: "cyan" | "violet" | "blue" | "amber";
  index?: number;
};

const accentMap = {
  cyan: {
    border: "border-cyan-200/70",
    glow: "hover:shadow-[0_8px_28px_-8px_rgba(14,165,233,0.2)]",
    icon: "text-cyan-700",
    bg: "from-cyan-100/40 to-transparent",
  },
  violet: {
    border: "border-violet-200/80",
    glow: "hover:shadow-[0_8px_28px_-8px_rgba(139,92,246,0.15)]",
    icon: "text-violet-700",
    bg: "from-violet-100/50 to-transparent",
  },
  blue: {
    border: "border-blue-200/80",
    glow: "hover:shadow-[0_8px_28px_-8px_rgba(59,130,246,0.15)]",
    icon: "text-blue-700",
    bg: "from-blue-100/50 to-transparent",
  },
  amber: {
    border: "border-amber-200/90",
    glow: "hover:shadow-[0_8px_28px_-8px_rgba(245,158,11,0.12)]",
    icon: "text-amber-700",
    bg: "from-amber-100/50 to-transparent",
  },
};

export function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  accent = "cyan",
  index = 0,
}: Props) {
  const a = accentMap[accent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_8px_28px_-10px_rgba(14,165,233,0.1)] transition-all duration-300",
        a.border,
        a.glow,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80", a.bg)} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">{description}</p>
        </div>
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-200/80 bg-cyan-50",
            a.icon,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>
    </motion.div>
  );
}
