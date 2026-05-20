"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atom,
  ChevronDown,
  FlaskConical,
  Gauge,
  Hexagon,
  Play,
  Sparkles,
  Weight,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ExamScopeUnitCard = {
  id: string;
  unitTitle: string;
  unitCode: string;
  skillCount: number;
  sortOrder: number;
};

type Props = {
  units: ExamScopeUnitCard[];
};

function unitIcon(unitTitle: string, index: number) {
  const n = unitTitle.toLowerCase();
  if (n.includes("有機") || n.includes("化學")) return Atom;
  if (n.includes("力") || n.includes("壓")) return Weight;
  if (n.includes("酸") || n.includes("鹼")) return FlaskConical;
  if (n.includes("速率") || n.includes("反應")) return Gauge;
  const icons = [Atom, Weight, FlaskConical, Gauge];
  return icons[index % icons.length]!;
}

function UnitCard({
  unit,
  index,
  isOpen,
  onToggle,
}: {
  unit: ExamScopeUnitCard;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = unitIcon(unit.unitTitle, index);
  const unitHref = `/student/unit/${unit.id}`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-3xl border border-cyan-200/70 bg-white/85 shadow-[0_8px_32px_-12px_rgba(99,102,241,0.18)] backdrop-blur-md transition duration-300",
        "hover:scale-[1.01] hover:border-cyan-300 hover:shadow-[0_12px_40px_-8px_rgba(34,211,238,0.28)]",
        isOpen && "scale-[1.01] border-cyan-400/80 shadow-[0_12px_44px_-8px_rgba(34,211,238,0.3)]",
      )}
    >
      <motion.button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="group relative flex w-full flex-col gap-4 p-5 text-left hover:bg-cyan-50/30 sm:flex-row sm:items-center sm:justify-between sm:p-6"
        whileTap={{ scale: 0.998 }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/8 via-transparent to-indigo-400/8" />
        </div>

        <div className="relative flex min-w-0 flex-1 items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-sky-50 text-cyan-700 shadow-inner shadow-cyan-100/60 sm:h-16 sm:w-16">
            <div className="relative flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14">
              <Hexagon className="absolute h-full w-full text-cyan-300/50" strokeWidth={1.25} />
              <Icon className="relative z-[1] h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-lg font-bold text-slate-900 sm:text-xl">{unit.unitTitle}</h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                {unit.unitCode}
              </span>
              <span className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-800">
                技能數：{unit.skillCount}
              </span>
            </div>
            <p className="text-sm text-slate-600">觀看影片、完成測驗與 AI 診斷</p>
          </div>
        </div>

        <div className="relative flex shrink-0 flex-col items-center gap-1 sm:items-end sm:pr-1">
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-cyan-200/80 bg-cyan-50/90 text-cyan-700 shadow-sm"
          >
            <ChevronDown className="h-5 w-5" aria-hidden />
          </motion.div>
          <span className="text-xs font-semibold text-cyan-800">{isOpen ? "收合" : "展開查看"}</span>
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen ? (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-cyan-100/60"
          >
            <div className="space-y-4 bg-gradient-to-b from-white/70 to-slate-50/50 px-5 py-5 sm:px-6">
              <p className="text-sm leading-relaxed text-slate-600">
                由此進入單元，依序觀看教學影片、完成隨堂測驗，並依老師安排進行智慧練習。
              </p>
              <Link
                href={unitHref}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-[0_4px_24px_-4px_rgba(8,145,178,0.5)] transition hover:brightness-105 sm:w-auto sm:min-w-[200px]"
              >
                <Play className="h-4 w-4 fill-current" aria-hidden />
                開始學習
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function ExamScopeUnitsPanel({ units }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const ordered = useMemo(
    () =>
      [...units].sort(
        (a, b) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.unitTitle.localeCompare(b.unitTitle, "zh-Hant"),
      ),
    [units],
  );

  if (units.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-lg backdrop-blur-sm">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-cyan-500" aria-hidden />
        <p className="font-semibold text-slate-900">此段考範圍尚未掛載單元</p>
        <p className="mt-2 text-sm text-slate-600">請待教師於後台完成單元設定後再查看。</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="exam-scope-units-heading">
      <h2 id="exam-scope-units-heading" className="mb-4 text-base font-bold text-slate-900">
        單元列表
      </h2>
      <div className="space-y-5">
        {ordered.map((unit, index) => (
          <UnitCard
            key={unit.id}
            unit={unit}
            index={index}
            isOpen={openIds.has(unit.id)}
            onToggle={() => toggle(unit.id)}
          />
        ))}
      </div>
    </section>
  );
}
