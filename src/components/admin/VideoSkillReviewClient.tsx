"use client";

import { useEffect, useState } from "react";

type Candidate = {
  id: string;
  video_id: string;
  video_title: string | null;
  unit: string | null;
  suggested_skill_code: string;
  suggested_skill_name: string | null;
  confidence: number | null;
  reason: string | null;
  subtitle_available: boolean;
  status: "pending" | "approved" | "rejected";
};

type RowState = { loading: boolean; customSkill: string };

function lowConfidence(conf: number | null): boolean {
  return typeof conf === "number" && conf < 0.6;
}

export function VideoSkillReviewClient() {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [stateById, setStateById] = useState<Record<string, RowState>>({});

  async function load() {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch("/api/admin/video-skill-candidates?status=pending", { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.detail ? `${data?.error ?? "LOAD_FAILED"}（${data.detail}）` : data?.error ?? "LOAD_FAILED");
        setLoading(false);
        return;
      }
      if (typeof data?.message === "string") {
        setWarning(data.message);
      }
      const list = (data?.candidates ?? []) as Candidate[];
      setRows(list);
      const next: Record<string, RowState> = {};
      for (const r of list) {
        next[r.id] = { loading: false, customSkill: r.suggested_skill_code };
      }
      setStateById(next);
    } catch {
      setError("LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function patchCandidate(id: string, body: Record<string, unknown>) {
    setStateById((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { customSkill: "" }), loading: true } }));
    try {
      const res = await fetch(`/api/admin/video-skill-candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        alert(`操作失敗：${data?.error ?? res.status}`);
      } else {
        setRows((prev) => prev.filter((r) => r.id !== id));
      }
    } finally {
      setStateById((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { customSkill: "" }), loading: false } }));
    }
  }

  if (loading) return <p className="text-sm text-slate-400">載入候選資料中…</p>;
  if (error) return <p className="text-sm text-rose-700">載入失敗：{error}</p>;
  if (rows.length === 0) {
    return (
      <div className="space-y-3">
        {warning ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{warning}</p>
        ) : null}
        <p className="rounded-xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-5 text-sm text-slate-400">目前沒有待審核候選。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const rowState = stateById[r.id] ?? { loading: false, customSkill: r.suggested_skill_code };
        return (
          <section key={r.id} className="rounded-xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-medium text-slate-900">{r.video_title || "(無標題影片)"}</h3>
                <p className="mt-1 text-xs text-slate-500">video_id: {r.video_id}</p>
                <p className="mt-1 text-xs text-slate-500">unit: {r.unit || "-"}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold text-slate-900">{r.suggested_skill_code}</p>
                <p className="text-slate-400">{r.suggested_skill_name || "-"}</p>
                <p className="text-slate-400">confidence: {typeof r.confidence === "number" ? r.confidence.toFixed(2) : "-"}</p>
                {lowConfidence(r.confidence) ? (
                  <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    建議人工確認
                  </p>
                ) : null}
              </div>
            </div>
            <p className="mt-3 rounded bg-slate-50/80 p-3 text-sm text-slate-600">{r.reason || "(無理由)"}</p>
            <p className="mt-2 text-xs text-slate-500">字幕：{r.subtitle_available ? "有" : "無"}</p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                value={rowState.customSkill}
                onChange={(e) =>
                  setStateById((prev) => ({
                    ...prev,
                    [r.id]: { ...(prev[r.id] ?? { loading: false }), customSkill: e.target.value.toUpperCase() },
                  }))
                }
                className="rounded border border-slate-200/90 px-2 py-1 text-sm"
                placeholder="修改 skill_code"
              />
              <button
                disabled={rowState.loading}
                onClick={() => void patchCandidate(r.id, { action: "approve" })}
                className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                核准
              </button>
              <button
                disabled={rowState.loading || !rowState.customSkill.trim()}
                onClick={() =>
                  void patchCandidate(r.id, {
                    action: "approve_with_skill_code",
                    skill_code: rowState.customSkill.trim().toUpperCase(),
                  })
                }
                className="rounded bg-cyan-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
              >
                修改後核准
              </button>
              <button
                disabled={rowState.loading}
                onClick={() => void patchCandidate(r.id, { action: "reject" })}
                className="rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
              >
                拒絕
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
