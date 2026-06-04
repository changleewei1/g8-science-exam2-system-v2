"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, History, Loader2 } from "lucide-react";

type BankRow = {
  id: string;
  question_text: string;
  skill_code: string;
  version: number | null;
  change_reason: string | null;
  updated_at: string | null;
  video_id: string | null;
  videos: { id: string; title: string } | null;
};

type RevRow = {
  id: string;
  version: number;
  previous_version: number;
  change_reason: string | null;
  edited_at: string;
  editor_label: string | null;
};

export function QuestionBankAdminClient() {
  const [items, setItems] = useState<BankRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [revsByQ, setRevsByQ] = useState<Record<string, RevRow[]>>({});
  const [loadingRev, setLoadingRev] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch("/api/admin/question-bank", { credentials: "include" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr((j as { detail?: string }).detail ?? "載入失敗");
      setItems([]);
    } else {
      setItems((j as { items: BankRow[] }).items ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleHistory = async (qid: string) => {
    if (openId === qid) {
      setOpenId(null);
      return;
    }
    setOpenId(qid);
    if (revsByQ[qid]) return;
    setLoadingRev(qid);
    const res = await fetch(`/api/admin/question-bank/${qid}/revisions`, { credentials: "include" });
    const j = await res.json().catch(() => ({}));
    setLoadingRev(null);
    if (!res.ok) {
      setErr((j as { detail?: string }).detail ?? "載入歷史失敗");
      return;
    }
    setRevsByQ((prev) => ({ ...prev, [qid]: (j as { revisions: RevRow[] }).revisions ?? [] }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          重新整理
        </button>
      </div>
      {err ? <p className="text-sm text-rose-700">{err}</p> : null}
      {loading ? <p className="text-sm text-slate-600">載入中…</p> : null}
      <ul className="space-y-3">
        {items.map((it) => {
          const v = it.version ?? 1;
          const expanded = openId === it.id;
          return (
            <li key={it.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono text-slate-500">{it.id}</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{it.question_text}</p>
                  <p className="mt-1 text-xs text-slate-600">
                    {it.videos?.title ? `影片：${it.videos.title}` : "（無影片）"} · skill {it.skill_code}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-right">
                  <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-900">
                    v{v}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleHistory(it.id)}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-cyan-700 hover:underline"
                  >
                    <History className="h-3.5 w-3.5" />
                    查看歷史版本
                    {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {expanded ? (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {loadingRev === it.id ? (
                    <p className="text-xs text-slate-500">載入歷史…</p>
                  ) : (
                    <ul className="max-h-56 space-y-2 overflow-y-auto text-xs">
                      {(revsByQ[it.id] ?? []).map((r) => (
                        <li key={r.id} className="rounded-lg bg-slate-50 px-2 py-2 text-slate-800">
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(r.edited_at).toLocaleString("zh-TW")}
                          </span>
                          <span className="ml-2 font-semibold">
                            v{r.previous_version} → v{r.version}
                          </span>
                          {r.editor_label ? (
                            <span className="ml-2 text-slate-600">· {r.editor_label}</span>
                          ) : (
                            <span className="ml-2 text-slate-500">· 系統</span>
                          )}
                          <p className="mt-1 text-slate-700">{r.change_reason ?? "—"}</p>
                        </li>
                      ))}
                      {(revsByQ[it.id] ?? []).length === 0 ? (
                        <li className="text-slate-500">尚無歷史紀錄（尚未升版或 migration 前資料）。</li>
                      ) : null}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
