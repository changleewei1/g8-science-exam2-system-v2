"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "@/lib/exam3-scope";

type Item = {
  id: string;
  video_id: string;
  unit: string;
  skill_code: string;
  difficulty: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  status: string;
  created_at: string;
};

export function QuestionCandidatesAdminClient() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState("draft");
  const [unitTitle, setUnitTitle] = useState("");
  const [videoId, setVideoId] = useState("");
  const [skillCode, setSkillCode] = useState("");
  const [onlyExam3, setOnlyExam3] = useState(true);
  const [editing, setEditing] = useState<Record<string, Partial<Item>>>({});

  const qs = useMemo(() => {
    const u = new URLSearchParams();
    if (status) u.set("status", status);
    if (videoId.trim()) u.set("videoId", videoId.trim());
    if (skillCode.trim()) u.set("skillCode", skillCode.trim());
    if (onlyExam3) u.set("examScopeId", G8_SPRING_TERM_EXAM3_SCOPE_ID);
    else if (unitTitle.trim()) u.set("unitTitle", unitTitle.trim());
    return u.toString();
  }, [status, videoId, skillCode, unitTitle, onlyExam3]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/admin/generated-question-candidates?${qs}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "載入失敗");
      setItems([]);
      setLoading(false);
      return;
    }
    setItems((data.items ?? []) as Item[]);
    setLoading(false);
  }, [qs]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  async function patch(id: string, body: Record<string, unknown>) {
    setErr(null);
    const res = await fetch(`/api/admin/generated-question-candidates/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.message || data.error || "操作失敗");
      return;
    }
    await load();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900">題目候選審核</h1>
      <p className="text-sm text-slate-400">
        核准後寫入題庫並同步該影片「影片理解測驗」（須已累積至少 3 題核准且皆屬同一影片）。僅 approved 題目會進入測驗。
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          狀態
          <select
            className="ml-1 rounded border border-slate-200/90 px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">draft</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="">全部</option>
          </select>
        </label>
        <label className="text-sm">
          <input type="checkbox" checked={onlyExam3} onChange={(e) => setOnlyExam3(e.target.checked)} />{" "}
          僅第三次段考
        </label>
        {!onlyExam3 ? (
          <label className="text-sm">
            單元標題
            <input
              className="ml-1 rounded border border-slate-200/90 px-2 py-1 text-sm"
              value={unitTitle}
              onChange={(e) => setUnitTitle(e.target.value)}
              placeholder="例如 酸鹼中和"
            />
          </label>
        ) : null}
        <label className="text-sm">
          video_id
          <input
            className="ml-1 w-56 rounded border border-slate-200/90 px-2 py-1 font-mono text-xs"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
          />
        </label>
        <label className="text-sm">
          skill_code
          <input
            className="ml-1 w-28 rounded border border-slate-200/90 px-2 py-1 text-xs"
            value={skillCode}
            onChange={(e) => setSkillCode(e.target.value)}
          />
        </label>
        <button
          type="button"
          className="rounded-lg bg-slate-800 px-3 py-1 text-sm text-white"
          onClick={() => void load()}
        >
          重新載入
        </button>
      </div>

      {err ? <p className="text-sm text-rose-700">{err}</p> : null}
      {loading ? <p>載入中…</p> : null}

      <ul className="space-y-6">
        {items.map((it) => {
          const e = editing[it.id] ?? {};
          const qtext = e.question_text ?? it.question_text;
          return (
            <li key={it.id} className="rounded-xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-4 shadow-sm">
              <p className="text-xs text-slate-500">
                {it.id} · {it.status} · {it.skill_code} · {it.video_id}
              </p>
              {it.status === "draft" ? (
                <textarea
                  className="mt-2 w-full rounded border border-slate-200/90 p-2 text-sm"
                  rows={3}
                  value={qtext}
                  onChange={(ev) =>
                    setEditing((m) => ({ ...m, [it.id]: { ...m[it.id], question_text: ev.target.value } }))
                  }
                />
              ) : (
                <p className="mt-2 text-sm font-medium text-slate-900">{it.question_text}</p>
              )}
              <p className="mt-2 text-xs text-slate-400">
                A {it.choice_a} / B {it.choice_b} / C {it.choice_c} / D {it.choice_d} · 正解 {it.correct_answer}
              </p>
              {it.status === "draft" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg bg-slate-50 px-3 py-1 text-sm"
                    onClick={() =>
                      void patch(it.id, {
                        action: "update",
                        question_text: (editing[it.id]?.question_text ?? it.question_text).trim(),
                      })
                    }
                  >
                    儲存編輯
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-cyan-600 px-3 py-1 text-sm text-white"
                    onClick={() => void patch(it.id, { action: "approve" })}
                  >
                    核准
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-rose-100 px-3 py-1 text-sm text-rose-800"
                    onClick={() => void patch(it.id, { action: "reject" })}
                  >
                    拒絕
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
