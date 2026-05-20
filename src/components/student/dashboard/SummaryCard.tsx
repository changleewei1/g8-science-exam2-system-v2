"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  index?: number;
};

export function SummaryCard({ icon: Icon, label, value, hint, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200/90",
        "bg-white p-4 shadow-sm",
        "transition-shadow duration-300 hover:border-cyan-300/80 hover:shadow-md",
      )}
    >
      <motion.div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl"
        animate={{ opacity: [0.3, 0.55, 0.3] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
      <motion.div
        className="mb-3 inline-flex rounded-xl border border-cyan-200 bg-cyan-50 p-2.5 text-cyan-700"
        whileHover={{ rotate: [0, -6, 6, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </motion.div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-600">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </motion.div>
  );
}
