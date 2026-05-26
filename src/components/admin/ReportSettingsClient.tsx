"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { adminTopHeader, adminTopHeaderInner } from "@/lib/admin-ui";
import {
  DAILY_REPORT_MODE_LABELS,
  intersectSectionsWithReportMode,
  TEACHER_EMAIL_SECTION_KEYS,
  TEACHER_SECTION_LABELS,
  type DailyReportMode,
  type TeacherEmailSectionKey,
} from "@/lib/admin/teacher-report-preferences";
import { cn } from "@/lib/utils";

type PrefsPayload = {
  reportScope: string;
  emailEnabled: boolean;
  sendTime: string;
  enabledSections: Record<string, boolean>;
  parentSummaryEnabled: boolean;
  parentSendMode: string;
  parentEnabledSections: Record<string, boolean>;
  selectedScopeId: string | null;
  selectedUnitIds: string[];
  reportMode: string;
  reportModeLabels: Record<string, string>;
  sectionLabels: { teacher: Record<string, string>; parent: Record<string, string> };
};

type ExamScopeOpt = { id: string; title: string; isFallback?: boolean };
type UnitCard = { id: string; title: string; videoCount: number; skillCount: number };

type PreviewPayload = {
  subject: string;
  examScopeTitle: string;
  reportModeLabel: string;
  studentCount: number;
  scopeUnitTitles: string[];
  sectionsOn: { key: string; label: string }[];
  html: string;
};

const PARENT_MODES: { value: string; label: string; hint: string }[] = [
  { value: "manual", label: "僅手動寄送", hint: "cron 不自動寄家長信。" },
  { value: "all", label: "每天寄給全部家長", hint: "有 parent_email 者。" },
  { value: "risk_only", label: "僅高風險（完成率低於 30%）", hint: "cron 篩選。" },
  { value: "incomplete_only", label: "僅未完成段考範圍", hint: "cron 篩選。" },
];

const MODE_UI: Record<
  DailyReportMode,
  { emoji: string; tag: string; dotClass: string; selected: string; idle: string }
> = {
  preview: {
    emoji: "🟢",
    tag: "影片觀看 · 測驗完成",
    dotClass: "bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.45)]",
    selected:
      "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white ring-2 ring-emerald-200/90 shadow-md shadow-emerald-100/70",
    idle: "border-slate-200/90 bg-white hover:border-emerald-200 hover:shadow-md",
  },
  practice: {
    emoji: "🔵",
    tag: "Skill 熟練 · 錯誤率",
    dotClass: "bg-sky-500 shadow-[0_0_14px_rgba(14,165,233,0.45)]",
    selected:
      "border-sky-300 bg-gradient-to-br from-sky-50 to-white ring-2 ring-sky-200/90 shadow-md shadow-sky-100/70",
    idle: "border-slate-200/90 bg-white hover:border-sky-200 hover:shadow-md",
  },
  sprint: {
    emoji: "🟠",
    tag: "高風險 · 弱點",
    dotClass: "bg-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.45)]",
    selected:
      "border-orange-300 bg-gradient-to-br from-orange-50 to-white ring-2 ring-orange-200/90 shadow-md shadow-orange-100/70",
    idle: "border-slate-200/90 bg-white hover:border-orange-200 hover:shadow-md",
  },
  review: {
    emoji: "🟣",
    tag: "歷史錯題 · 補強",
    dotClass: "bg-violet-500 shadow-[0_0_14px_rgba(139,92,246,0.45)]",
    selected:
      "border-violet-300 bg-gradient-to-br from-violet-50 to-white ring-2 ring-violet-200/90 shadow-md shadow-violet-100/70",
    idle: "border-slate-200/90 bg-white hover:border-violet-200 hover:shadow-md",
  },
};

function UnitHexIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 52"
      className={cn("h-11 w-10 shrink-0 text-sky-500", className)}
      aria-hidden
    >
      <path
        d="M24 2 44 13.5v25L24 50 4 38.5v-25L24 2Z"
        className="fill-sky-100 stroke-sky-300"
        strokeWidth="1.25"
      />
      <path d="M24 14v18M17 23h14" className="stroke-sky-400/80" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function isDailyReportMode(v: string): v is DailyReportMode {
  return v === "preview" || v === "practice" || v === "sprint" || v === "review";
}

export function ReportSettingsClient() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<PrefsPayload | null>(null);
  const [examScopes, setExamScopes] = useState<ExamScopeOpt[]>([]);
  const [reportScopeChoices, setReportScopeChoices] = useState<ExamScopeOpt[]>([]);
  const [effectiveExamScope, setEffectiveExamScope] = useState<ExamScopeOpt | null>(null);
  const [systemAutoPickExamScope, setSystemAutoPickExamScope] = useState<ExamScopeOpt | null>(null);
  const [scopeUnits, setScopeUnits] = useState<UnitCard[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/report-settings", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      setErr(typeof data.message === "string" ? data.message : "載入設定失敗");
      return;
    }
    setPrefs(data.preferences as PrefsPayload);
    const scopes = (data.examScopes ?? []) as ExamScopeOpt[];
    setExamScopes(scopes);
    setReportScopeChoices(((data.reportExamScopeChoices ?? scopes) as ExamScopeOpt[]) ?? []);
    setEffectiveExamScope((data.effectiveExamScope ?? null) as ExamScopeOpt | null);
    setSystemAutoPickExamScope((data.systemAutoPickExamScope ?? null) as ExamScopeOpt | null);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  const scopeIdForUnits = useMemo(() => {
    const manual = prefs?.selectedScopeId?.trim();
    if (manual) return manual;
    return effectiveExamScope?.id ?? "";
  }, [prefs?.selectedScopeId, effectiveExamScope?.id]);

  useEffect(() => {
    if (!scopeIdForUnits) {
      setScopeUnits([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const res = await fetch(
        `/api/admin/report-settings/scope-units?examScopeId=${encodeURIComponent(scopeIdForUnits)}`,
        { credentials: "include" },
      );
      const data = await res.json().catch(() => ({}));
      if (cancelled || !data.ok) return;
      setScopeUnits((data.units ?? []) as UnitCard[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [scopeIdForUnits]);

  const effectiveSections = useMemo(() => {
    if (!prefs) return [];
    const mode = isDailyReportMode(prefs.reportMode) ? prefs.reportMode : "preview";
    const vis = intersectSectionsWithReportMode(
      mode,
      prefs.enabledSections as Record<TeacherEmailSectionKey, boolean>,
    );
    return TEACHER_EMAIL_SECTION_KEYS.filter((k) => vis[k] !== false).map((k) => TEACHER_SECTION_LABELS[k]);
  }, [prefs]);

  const summaryExamTitle = useMemo(() => {
    if (!prefs) return "—";
    if (prefs.selectedScopeId?.trim()) {
      const row = examScopes.find((s) => s.id === prefs.selectedScopeId);
      return row?.title ?? effectiveExamScope?.title ?? "—";
    }
    return effectiveExamScope?.title ?? "—";
  }, [prefs, examScopes, effectiveExamScope]);

  const summaryUnitLines = useMemo(() => {
    if (!prefs || scopeUnits.length === 0) return [];
    const allIds = scopeUnits.map((u) => u.id);
    const sel = prefs.selectedUnitIds;
    const useAll = sel.length === 0 || sel.length >= allIds.length;
    const chosen = useAll ? scopeUnits : scopeUnits.filter((u) => sel.includes(u.id));
    return chosen.map((u) => ({
      label: u.title,
      on: useAll || sel.includes(u.id),
    }));
  }, [prefs, scopeUnits]);

  function setTeacherSection(key: string, v: boolean) {
    setPrefs((p) =>
      p
        ? {
            ...p,
            enabledSections: { ...p.enabledSections, [key]: v },
          }
        : p,
    );
  }

  function setParentSection(key: string, v: boolean) {
    setPrefs((p) =>
      p
        ? {
            ...p,
            parentEnabledSections: { ...p.parentEnabledSections, [key]: v },
          }
        : p,
    );
  }

  function isUnitChecked(unitId: string): boolean {
    if (!prefs) return false;
    if (prefs.selectedUnitIds.length === 0) return true;
    return prefs.selectedUnitIds.includes(unitId);
  }

  function toggleUnit(unitId: string, checked: boolean) {
    setPrefs((p) => {
      if (!p) return p;
      const allIds = scopeUnits.map((u) => u.id);
      let cur = p.selectedUnitIds.length > 0 ? [...p.selectedUnitIds] : [...allIds];
      if (checked) {
        if (!cur.includes(unitId)) cur.push(unitId);
      } else {
        cur = cur.filter((x) => x !== unitId);
      }
      if (cur.length >= allIds.length && allIds.length > 0) cur = [];
      return { ...p, selectedUnitIds: cur };
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!prefs) return;
    setSaving(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/report-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailEnabled: prefs.emailEnabled,
          sendTime: prefs.sendTime,
          enabledSections: prefs.enabledSections,
          parentSummaryEnabled: prefs.parentSummaryEnabled,
          parentSendMode: prefs.parentSendMode,
          parentEnabledSections: prefs.parentEnabledSections,
          selectedScopeId: prefs.selectedScopeId,
          selectedUnitIds: prefs.selectedUnitIds,
          reportMode: prefs.reportMode,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(typeof data.message === "string" ? data.message : "儲存失敗");
        return;
      }
      setPrefs(data.preferences as PrefsPayload);
      setEffectiveExamScope((data.effectiveExamScope ?? null) as ExamScopeOpt | null);
      setSystemAutoPickExamScope((data.systemAutoPickExamScope ?? null) as ExamScopeOpt | null);
      setNotice("已儲存設定。");
    } finally {
      setSaving(false);
    }
  }

  async function onTeacherEmailPreview() {
    setPreviewing(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/report-settings/teacher-email-preview", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(typeof data.message === "string" ? data.message : "預覽失敗");
        return;
      }
      setPreviewData({
        subject: data.subject,
        examScopeTitle: data.examScopeTitle,
        reportModeLabel: data.reportModeLabel,
        studentCount: data.studentCount,
        scopeUnitTitles: data.scopeUnitTitles ?? [],
        sectionsOn: data.sectionsOn ?? [],
        html: data.html,
      });
      setDrawerOpen(true);
    } finally {
      setPreviewing(false);
    }
  }

  async function onSendTestEmail() {
    setTesting(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/test-email/teacher-report", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(typeof data.message === "string" ? data.message : "寄送失敗");
        return;
      }
      setNotice(`測試信已寄至管理員信箱（Resend id: ${data.emailId ?? "—"}），內容依目前儲存之設定產生。`);
    } finally {
      setTesting(false);
    }
  }

  if (loading || !prefs) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#f0f5fb] px-4 text-slate-500">
        {err ? <p className="text-rose-600">{err}</p> : <p>載入中…</p>}
      </div>
    );
  }

  const modeKey = isDailyReportMode(prefs.reportMode) ? prefs.reportMode : "preview";
  const modeUi = MODE_UI[modeKey];

  return (
    <div className="min-h-[100dvh] bg-[#f0f5fb] text-slate-800">
      <header
        className={cn(
          adminTopHeader,
          "border-sky-100/80 bg-white/85 shadow-sm shadow-sky-100/40 backdrop-blur-md",
        )}
      >
        <div className={adminTopHeaderInner}>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/admin"
              className="text-sm font-medium text-sky-700 transition hover:text-sky-900"
            >
              ← 後台首頁
            </Link>
            <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600/90">Report</p>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">每日報表設定</h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">國二理化｜模式、段考範圍與 Email 預覽</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
        {err ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {err}
          </div>
        ) : null}
        {notice ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {notice}
          </div>
        ) : null}

        <form onSubmit={onSave} className="space-y-6">
          {/* 報表模式 */}
          <section className="rounded-2xl border border-sky-100/90 bg-white p-6 shadow-sm shadow-sky-100/50 sm:p-7">
            <h2 className="text-base font-bold text-slate-900">報表模式</h2>
            <p className="mt-1 text-sm text-slate-500">先選擇分析重點，再決定段考與單元範圍。</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(prefs.reportModeLabels) as DailyReportMode[]).map((key) => {
                const ui = MODE_UI[key];
                const active = prefs.reportMode === key;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    whileHover={{ y: -2 }}
                    onClick={() => setPrefs({ ...prefs, reportMode: key })}
                    className={cn(
                      "relative overflow-hidden rounded-2xl border p-4 text-left transition",
                      active ? ui.selected : ui.idle,
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg",
                          ui.dotClass,
                        )}
                        aria-hidden
                      >
                        {ui.emoji}
                      </span>
                      <div>
                        <p className={cn("font-semibold", active ? "text-slate-900" : "text-slate-700")}>
                          {prefs.reportModeLabels[key]}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{ui.tag}</p>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </section>

          {/* 報表範圍 */}
          <section className="rounded-2xl border border-sky-100/90 bg-white p-6 shadow-sm shadow-sky-100/50 sm:p-7">
            <h2 className="text-base font-bold text-slate-900">報表範圍</h2>
            <p className="mt-1 text-sm text-slate-500">
              段考與單元決定統計範圍；未指定段考時依 active 段考與系統規則自動解析。
            </p>

            <div className="mt-5">
              <label className="text-xs font-semibold text-sky-800">報表段考</label>
              <select
                className="mt-2 w-full max-w-xl rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={prefs.selectedScopeId ?? ""}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setPrefs({
                    ...prefs,
                    selectedScopeId: v === "" ? null : v,
                    selectedUnitIds: [],
                  });
                }}
              >
                <option value="">
                  {effectiveExamScope
                    ? effectiveExamScope.isFallback
                      ? "⚠️ 尚未設定 active 段考"
                      : `🤖 自動模式（目前：${effectiveExamScope.title}）`
                    : "⚠️ 資料庫尚無段考資料"}
                </option>
                {reportScopeChoices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-900">
                  段考範圍：{summaryExamTitle}
                </span>
                {effectiveExamScope?.isFallback ? (
                  <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900">
                    備援：目前無 is_active 段考，使用資料庫中段考作為預覽
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-xs font-semibold text-sky-800">單元（點選卡片勾選）</p>
              {!scopeIdForUnits ? (
                <p className="mt-3 text-sm text-slate-500">無法載入單元：尚無可解析的段考。</p>
              ) : scopeUnits.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">此段考尚無單元。</p>
              ) : (
                <div className="mt-4 flex flex-col gap-3">
                  {scopeUnits.map((u) => {
                    const on = isUnitChecked(u.id);
                    return (
                      <motion.button
                        key={u.id}
                        type="button"
                        whileHover={{ scale: 1.005 }}
                        whileTap={{ scale: 0.995 }}
                        onClick={() => toggleUnit(u.id, !on)}
                        className={cn(
                          "relative flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition",
                          on
                            ? "border-sky-300 bg-gradient-to-r from-sky-50 to-white shadow-md shadow-sky-100/80 ring-2 ring-sky-200/60"
                            : "border-slate-200/90 bg-white hover:border-sky-200 hover:shadow-md",
                        )}
                      >
                        <UnitHexIcon />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{u.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {u.videoCount} 支影片 · {u.skillCount} 個技能標籤
                          </p>
                        </div>
                        <span
                          className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
                            on
                              ? "border-sky-500 bg-sky-500 text-white shadow-md shadow-sky-200"
                              : "border-slate-200 bg-slate-50 text-slate-400",
                          )}
                        >
                          {on ? "✓" : ""}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* 報表預覽摘要 */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/40 to-white p-6 shadow-md shadow-sky-100/60 sm:p-8"
          >
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-sky-200/30 blur-3xl"
              aria-hidden
            />
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">報表預覽 · 目前每日設定摘要</h2>
            <div className="mt-5 grid gap-6 border-t border-sky-100/80 pt-5 sm:grid-cols-2">
              <div className="space-y-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">目前報表</p>
                <p className="text-lg font-semibold leading-snug text-slate-900">{summaryExamTitle}</p>
                <p className="text-slate-600">
                  {prefs.selectedScopeId ? (
                    <span className="font-medium text-sky-800">手動指定段考</span>
                  ) : (
                    <span>
                      <span className="mr-1">🤖</span>
                      <span className="font-medium text-sky-800">自動模式</span>
                      <span className="text-slate-500">（依 active 與挑選規則）</span>
                    </span>
                  )}
                </p>
                {!prefs.selectedScopeId && systemAutoPickExamScope && effectiveExamScope && (
                  <p className="text-xs text-slate-500">
                    純演算法 active 預設：{systemAutoPickExamScope.title}
                    {effectiveExamScope.id !== systemAutoPickExamScope.id
                      ? ` · 目前生效：${effectiveExamScope.title}（可能受偏好或環境變數影響）`
                      : ""}
                  </p>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">模式</p>
                <p className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                  <span>{modeUi.emoji}</span>
                  {DAILY_REPORT_MODE_LABELS[modeKey]}
                </p>
                <p className="text-slate-600">{modeUi.tag}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-6 border-t border-sky-100/80 pt-6 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">統計單元</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-800">
                  {summaryUnitLines.length === 0 ? (
                    <li className="text-slate-500">—（請確認段考與單元）</li>
                  ) : (
                    summaryUnitLines.map((u) => (
                      <li key={u.label} className="flex gap-2">
                        <span className="text-sky-600">{u.on ? "✓" : "○"}</span>
                        {u.label}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">每日 Email 區塊</p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-sm text-slate-800">
                  {effectiveSections.map((label) => (
                    <li key={label} className="flex gap-2">
                      <span className="text-sky-600">✓</span>
                      {label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-sky-100/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">寄送時間</p>
                <p className="mt-1 text-base font-medium text-slate-900">每日 {prefs.sendTime}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void load()}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300 hover:bg-sky-50"
                >
                  同步 active 段考
                </button>
                <button
                  type="button"
                  disabled={previewing}
                  onClick={() => void onTeacherEmailPreview()}
                  className="rounded-xl border border-sky-300 bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-200/80 transition hover:bg-sky-700 disabled:opacity-50"
                >
                  {previewing ? "產生預覽…" : "預覽老師版 Email"}
                </button>
                <button
                  type="button"
                  disabled={testing || !prefs.emailEnabled}
                  onClick={() => void onSendTestEmail()}
                  className="rounded-xl border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-40"
                >
                  {testing ? "寄送中…" : "寄送測試信"}
                </button>
              </div>
            </div>
            {!prefs.emailEnabled ? (
              <p className="mt-3 text-xs text-amber-700">老師信已關閉：測試寄送按鈕停用；預覽仍可使用。</p>
            ) : null}
          </motion.section>

          {/* 老師信區塊 */}
          <section className="rounded-2xl border border-sky-100/90 bg-white p-6 shadow-sm shadow-sky-100/50 sm:p-7">
            <h2 className="text-base font-bold text-slate-900">老師版 Email 區塊</h2>
            <p className="mt-1 text-sm text-slate-500">與報表模式交集後決定是否顯示。</p>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={prefs.emailEnabled}
                onChange={(e) => setPrefs({ ...prefs, emailEnabled: e.target.checked })}
              />
              啟用每日寄送老師信
            </label>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {Object.keys(prefs.sectionLabels.teacher).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-800 hover:border-sky-200"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={prefs.enabledSections[key] !== false}
                    onChange={(e) => setTeacherSection(key, e.target.checked)}
                  />
                  <span>{prefs.sectionLabels.teacher[key]}</span>
                </label>
              ))}
            </div>
          </section>

          {/* 家長 */}
          <section className="rounded-2xl border border-sky-100/90 bg-white p-6 shadow-sm shadow-sky-100/50 sm:p-7">
            <h2 className="text-base font-bold text-slate-900">家長版摘要</h2>
            <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                checked={prefs.parentSummaryEnabled}
                onChange={(e) => setPrefs({ ...prefs, parentSummaryEnabled: e.target.checked })}
              />
              啟用家長版摘要
            </label>
            <fieldset className="mt-4 space-y-2">
              <legend className="text-xs font-medium text-slate-500">寄送模式</legend>
              {PARENT_MODES.map((m) => (
                <label
                  key={m.value}
                  className="flex cursor-pointer gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-sky-200"
                >
                  <input
                    type="radio"
                    name="parentSendMode"
                    className="mt-1 text-sky-600 focus:ring-sky-500"
                    checked={prefs.parentSendMode === m.value}
                    onChange={() => setPrefs({ ...prefs, parentSendMode: m.value })}
                  />
                  <span>
                    <span className="font-medium text-slate-900">{m.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{m.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <Link
              href="/admin/reports/parent-preview"
              className="mt-3 inline-block text-sm font-medium text-sky-700 underline"
            >
              家長摘要預覽／手動寄送 →
            </Link>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {Object.keys(prefs.sectionLabels.parent).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-800"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    checked={prefs.parentEnabledSections[key] !== false}
                    onChange={(e) => setParentSection(key, e.target.checked)}
                  />
                  <span>{prefs.sectionLabels.parent[key]}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-sky-100/90 bg-white p-6 shadow-sm shadow-sky-100/50 sm:p-7">
            <h2 className="text-base font-bold text-slate-900">寄送時間（參考）</h2>
            <input
              type="text"
              className="mt-3 w-40 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              value={prefs.sendTime}
              onChange={(e) => setPrefs({ ...prefs, sendTime: e.target.value })}
              placeholder="21:00"
            />
          </section>

          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? "儲存中…" : "儲存設定"}
          </Button>
        </form>
      </main>

      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && previewData ? (
          <>
            <motion.button
              type="button"
              aria-label="關閉預覽"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-full flex-col border-l border-sky-100 bg-white shadow-2xl shadow-sky-200/40 sm:max-w-lg md:max-w-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">預覽</p>
                  <p className="text-sm font-semibold text-slate-900">老師版 Email</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
                >
                  關閉
                </button>
              </div>
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
                  <p className="text-xs text-slate-500">標題</p>
                  <p className="mt-1 font-medium text-sky-800">{previewData.subject}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs text-slate-500">統計學生</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">{previewData.studentCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs text-slate-500">模式</p>
                    <p className="mt-1 text-sm font-medium text-slate-900">{previewData.reportModeLabel}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm">
                  <p className="text-xs text-slate-500">段考範圍標題</p>
                  <p className="mt-1 text-slate-800">{previewData.examScopeTitle}</p>
                  {previewData.scopeUnitTitles.length > 0 ? (
                    <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
                      {previewData.scopeUnitTitles.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-medium text-slate-500">將顯示區塊</p>
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-700">
                    {previewData.sectionsOn.map((s) => (
                      <li key={s.key}>✓ {s.label}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-500">範例 HTML</p>
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <iframe title="Email 預覽" className="h-[min(70vh,520px)] w-full border-0" srcDoc={previewData.html} />
                  </div>
                </div>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
