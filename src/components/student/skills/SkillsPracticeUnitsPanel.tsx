"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Atom,
  ChevronDown,
  FlaskConical,
  Gauge,
  Hexagon,
  Sparkles,
  Weight,
} from "lucide-react";
import type { SkillPracticeStatus, StudentSkillPracticeRow } from "@/lib/skill-practice-summary";
import { cn } from "@/lib/utils";

export type SkillsPracticeUnitPayload = {
  unit_id: string;
  unit_name: string;
  skills: StudentSkillPracticeRow[];
};

type Props = {
  scopeId: string;
  units: SkillsPracticeUnitPayload[];
  isPracticeEnabled: boolean;
};

function statusBadgeClass(status: SkillPracticeStatus): string {
  if (status === "已精熟") return "bg-emerald-100 text-emerald-900 ring-emerald-200/60";
  if (status === "練習中") return "bg-amber-100 text-amber-900 ring-amber-200/60";
  if (status === "建議加強") return "bg-rose-100 text-rose-900 ring-rose-200/60";
  return "bg-slate-100 text-slate-700 ring-slate-200/60";
}

function fmtShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-TW", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/** 第一行顯示名稱；若無有效名稱則用 code。第二行僅在有名稱且與 code 不同時顯示 code，避免 C2-11-01 重複。 */
function skillDisplayLines(skill: StudentSkillPracticeRow) {
  const code = (skill.skill_code ?? "").trim();
  const rawName = (skill.skill_name ?? "").trim();
  const hasDistinctName = Boolean(rawName && rawName !== code);
  return {
    line1: hasDistinctName ? rawName : code,
    showCodeLine: hasDistinctName,
    code,
  };
}

function unitIcon(unitName: string, index: number) {
  const n = unitName.toLowerCase();
  if (n.includes("有機") || n.includes("化學")) return Atom;
  if (n.includes("力") || n.includes("壓")) return Weight;
  if (n.includes("酸") || n.includes("鹼")) return FlaskConical;
  if (n.includes("速率") || n.includes("反應")) return Gauge;
  const icons = [Atom, Weight, FlaskConical, Gauge];
  return icons[index % icons.length]!;
}

function SkillPracticeCard({
  skill,
  unitName,
  scopeId,
  isPracticeEnabled,
}: {
  skill: StudentSkillPracticeRow;
  unitName: string;
  scopeId: string;
  isPracticeEnabled: boolean;
}) {
  const href = `/student/lab/practice/${encodeURIComponent(skill.skill_code)}?scopeId=${encodeURIComponent(scopeId)}`;
  const pct = Math.min(100, Math.max(0, skill.mastery_score));
  const { line1, showCodeLine, code } = skillDisplayLines(skill);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-slate-200/90 bg-white/90 p-4 shadow-[0_4px_24px_-8px_rgba(14,165,233,0.12)] backdrop-blur-sm sm:p-5",
        "ring-1 ring-cyan-100/40",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-base font-bold text-slate-900">{line1}</p>
          {showCodeLine ? (
            <p className="font-mono text-xs font-medium text-sky-700/90">{code}</p>
          ) : null}
          <span className="inline-flex w-fit rounded-full border border-cyan-200/70 bg-cyan-50 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-900">
            {unitName}
          </span>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:min-w-[min(100%,420px)] lg:grid-cols-4">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-center sm:text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">題庫題數</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{skill.bank_question_count}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-center sm:text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">已作答</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{skill.answered_count}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-center sm:text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">答對</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{skill.correct_count}</p>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2 text-center sm:text-left">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">最近練習</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-800">{fmtShort(skill.last_practice_at)}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-slate-600">
            <span>熟練度</span>
            <span className="text-cyan-800">{skill.mastery_score} / 100</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/90">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-600 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
              statusBadgeClass(skill.status),
            )}
          >
            {skill.status}
          </span>
          {skill.bank_question_count <= 0 ? (
            <span className="text-xs font-medium text-amber-800">尚無題庫題目</span>
          ) : isPracticeEnabled ? (
            <Link
              href={href}
              className="inline-flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-4 text-sm font-semibold text-white shadow-[0_4px_20px_-4px_rgba(8,145,178,0.55)] transition hover:brightness-105 hover:shadow-[0_6px_28px_-4px_rgba(8,145,178,0.65)]"
            >
              {skill.status === "尚未開始" ? "開始練習" : "繼續練習"}
            </Link>
          ) : (
            <span className="text-xs font-medium text-slate-500">智慧練習尚未開放</span>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function UnitExpandCard({
  unit,
  index,
  scopeId,
  isPracticeEnabled,
  isOpen,
  onToggle,
}: {
  unit: SkillsPracticeUnitPayload;
  index: number;
  scopeId: string;
  isPracticeEnabled: boolean;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const Icon = unitIcon(unit.unit_name, index);
  const skillCount = unit.skills.length;

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
        className={cn(
          "group relative flex w-full flex-col gap-4 p-5 text-left sm:flex-row sm:items-center sm:justify-between sm:p-6",
          "hover:bg-cyan-50/30",
        )}
        whileTap={{ scale: 0.998 }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/8 via-transparent to-indigo-400/8" />
        </div>

        <div className="relative flex min-w-0 flex-1 items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50 via-white to-sky-50 text-cyan-700 shadow-inner shadow-cyan-100/60 sm:h-16 sm:w-16"
            style={{ clipPath: "none" }}
          >
            <div className="relative flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14">
              <Hexagon className="absolute h-full w-full text-cyan-300/50" strokeWidth={1.25} />
              <Icon className="relative z-[1] h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{unit.unit_name}</h2>
            <span className="inline-flex w-fit rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-bold text-sky-800">
              技能數：{skillCount}
            </span>
            <p className="text-sm text-slate-600">查看技能清單與智慧練習進度</p>
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
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-cyan-100/60 bg-gradient-to-b from-white/60 to-slate-50/40 px-3 pb-5 pt-4 sm:px-5">
              {unit.skills.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">此單元尚無技能資料</p>
              ) : (
                unit.skills.map((skill) => (
                  <SkillPracticeCard
                    key={skill.skill_code}
                    skill={skill}
                    unitName={unit.unit_name}
                    scopeId={scopeId}
                    isPracticeEnabled={isPracticeEnabled}
                  />
                ))
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function SkillsPracticeUnitsPanel({ scopeId, units, isPracticeEnabled }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (units.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-lg backdrop-blur-sm">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-cyan-500" aria-hidden />
        <p className="font-semibold text-slate-900">目前此段考範圍尚未建立技能清單</p>
        <p className="mt-2 text-sm text-slate-600">請待教師完成單元與題庫對應後再試。</p>
      </section>
    );
  }

  return (
      <div className="space-y-5">
        {units.map((unit, index) => (
        <UnitExpandCard
          key={unit.unit_id}
          unit={unit}
          index={index}
          scopeId={scopeId}
          isPracticeEnabled={isPracticeEnabled}
          isOpen={openIds.has(unit.unit_id)}
          onToggle={() => toggle(unit.unit_id)}
        />
      ))}
    </div>
  );
}
