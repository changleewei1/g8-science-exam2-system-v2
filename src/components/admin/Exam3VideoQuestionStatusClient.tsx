"use client";

import { useCallback, useEffect, useState } from "react";

type Readiness = "ready" | "pending_review" | "insufficient";

type Row = {
  videoId: string;
  title: string;
  unitTitle: string;
  hasSubtitle: boolean;
  skillTagCount: number;
  bankItemCount: number;
  draftCandidateCount: number;
  quizQuestionCount: number;
  quizNonPlaceholderCount: number;
  readyForStudents: boolean;
  readiness: Readiness;
  readinessLabel: string;
};

function rowClass(r: Readiness): string {
  if (r === "ready") return "border-b border-slate-100 bg-emerald-50/60";
  if (r === "pending_review") return "border-b border-slate-100 bg-amber-50/50";
  return "border-b border-slate-100 bg-rose-50/40";
}

export function Exam3VideoQuestionStatusClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/admin/exam3-video-question-status", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "無法載入");
      setRows([]);
      setLoading(false);
      return;
    }
    setRows((data.videos ?? []) as Row[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const readyN = rows.filter((r) => r.readiness === "ready").length;
  const pendingN = rows.filter((r) => r.readiness === "pending_review").length;
  const insufficientN = rows.filter((r) => r.readiness === "insufficient").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">第三次段考 · 影片題目狀態</h1>
          <p className="mt-1 text-sm text-slate-600">
            綠色：測驗真題 ≥3，學生可作答；黃色：draft 或題庫已足待同步；紅色：題目不足。
          </p>
          <p className="mt-2 text-xs text-slate-500">
            可作答 {readyN} · 待處理 {pendingN} · 不足 {insufficientN}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="interactive-btn rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm"
        >
          重新整理
        </button>
      </div>
      {loading ? <p className="text-slate-600">載入中…</p> : null}
      {err ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{err}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">狀態</th>
              <th className="px-3 py-2">單元</th>
              <th className="px-3 py-2">影片</th>
              <th className="px-3 py-2">字幕</th>
              <th className="px-3 py-2">技能</th>
              <th className="px-3 py-2">核准(題庫)</th>
              <th className="px-3 py-2">draft</th>
              <th className="px-3 py-2">測驗真題</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.videoId} className={rowClass(r.readiness)}>
                <td className="px-3 py-2">
                  <span
                    className={
                      r.readiness === "ready"
                        ? "font-medium text-emerald-800"
                        : r.readiness === "pending_review"
                          ? "font-medium text-amber-900"
                          : "font-medium text-rose-800"
                    }
                  >
                    {r.readinessLabel}
                  </span>
                </td>
                <td className="max-w-[120px] truncate px-3 py-2 text-slate-700">{r.unitTitle}</td>
                <td className="max-w-[220px] truncate px-3 py-2 text-slate-900" title={r.title}>
                  {r.title}
                </td>
                <td className="px-3 py-2">{r.hasSubtitle ? "有" : "無"}</td>
                <td className="px-3 py-2">{r.skillTagCount}</td>
                <td className="px-3 py-2">{r.bankItemCount}</td>
                <td className="px-3 py-2">{r.draftCandidateCount}</td>
                <td className="px-3 py-2">{r.quizNonPlaceholderCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
