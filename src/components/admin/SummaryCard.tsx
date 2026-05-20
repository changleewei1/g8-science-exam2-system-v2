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
    border: "border-cyan-400/25",
    glow: "hover:shadow-[0_0_32px_rgba(34,211,238,0.2)]",
    icon: "text-cyan-300",
    bg: "from-cyan-400/15 to-transparent",
  },
  violet: {
    border: "border-violet-400/25",
    glow: "hover:shadow-[0_0_32px_rgba(139,92,246,0.2)]",
    icon: "text-violet-300",
    bg: "from-violet-400/15 to-transparent",
  },
  blue: {
    border: "border-blue-400/25",
    glow: "hover:shadow-[0_0_32px_rgba(59,130,246,0.2)]",
    icon: "text-blue-300",
    bg: "from-blue-400/15 to-transparent",
  },
  amber: {
    border: "border-amber-400/25",
    glow: "hover:shadow-[0_0_32px_rgba(251,191,36,0.15)]",
    icon: "text-amber-300",
    bg: "from-amber-400/15 to-transparent",
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
        "group relative overflow-hidden rounded-2xl border bg-white/5 p-5 backdrop-blur-md transition-all duration-300",
        a.border,
        a.glow,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-70", a.bg)} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-slate-400">{title}</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value}</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{description}</p>
        </div>
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5",
            a.icon,
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      </div>
    </motion.div>
  );
}
