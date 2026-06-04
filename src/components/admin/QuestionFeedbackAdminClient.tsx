"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Bank = {
  id: string;
  question_text: string;
  skill_code: string;
  video_id: string | null;
  exam_scope_id?: string | null;
  unit?: string | null;
} | null;

type FeedbackRow = {
  id: string;
  feedback_type: string;
  comment: string | null;
  created_at: string;
};

type Item = {
  question_id: string;
  helpful_count: number;
  not_related_count: number;
  confusing_count: number;
  wrong_answer_count: number;
  bad_explanation_count: number;
  total_feedback_count?: number;
  quality_score: number;
  ai_confidence_score?: number;
  review_priority_score?: number;
  review_status: string;
  updated_at: string;
  bank: Bank;
  videoTitle?: string | null;
  recentFeedback: FeedbackRow[];
};

function sortByPriority(items: Item[]): Item[] {
  return [...items].sort(
    (a, b) => Number(b.review_priority_score ?? 0) - Number(a.review_priority_score ?? 0),
  );
}

export function QuestionFeedbackAdminClient() {
  const [status, setStatus] = useState<string>("all");
  const [issue, setIssue] = useState<string>("all");
  const [examScopeId, setExamScopeId] = useState("");
  const [skillCode, setSkillCode] = useState("");
  const [videoId, setVideoId] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setInfo(null);
    const sp = new URLSearchParams();
    if (status !== "all") sp.set("status", status);
    if (issue !== "all") sp.set("issue", issue);
    const es = examScopeId.trim();
    const sk = skillCode.trim();
    const vi = videoId.trim();
    if (es) sp.set("examScopeId", es);
    if (sk) sp.set("skillCode", sk);
    if (vi) sp.set("videoId", vi);
    const res = await fetch(`/api/admin/question-feedback?${sp.toString()}`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((json as { detail?: string }).detail ?? "載入失敗");
      setItems([]);
      setLoading(false);
      return;
    }
    setError(null);
    setItems((json as { items: Item[] }).items ?? []);
    setLoading(false);
  }, [status, issue, examScopeId, skillCode, videoId]);

  useEffect(() => {
    void load();
  }, [load]);

  const priorityBuckets = useMemo(() => {
    const s = sortByPriority(items);
    return {
      wrong: s.filter((x) => x.wrong_answer_count >= 1),
      nr: s.filter((x) => x.not_related_count >= 1 && x.wrong_answer_count === 0),
      soft: s.filter(
        (x) =>
          x.wrong_answer_count === 0 &&
          x.not_related_count === 0 &&
          (x.confusing_count >= 1 || x.bad_explanation_count >= 1),
      ),
    };
  }, [items]);

  async function patchReview(questionId: string, reviewStatus: string) {
    setBusyId(questionId);
    try {
      const res = await fetch(`/api/admin/question-feedback/${questionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reviewStatus }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError((j as { detail?: string }).detail ?? "更新失敗");
        return;
      }
      setError(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function tryRegenerate(questionId: string) {
    setBusyId(questionId);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/question-feedback/${questionId}/regenerate`, {
        method: "POST",
        credentials: "include",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError((j as { message?: string; detail?: string }).message ?? (j as { detail?: string }).detail ?? "請求失敗");
        return;
      }
      setError(null);
      setInfo(typeof (j as { message?: string }).message === "string" ? (j as { message: string }).message : "已建立候選重產題。");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function shortTitle(it: Item, len = 56) {
    const t = it.bank?.question_text ?? "（無題幹）";
    return t.length > len ? `${t.slice(0, len)}…` : t;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 text-sm text-amber-950">
        <h2 className="text-base font-semibold">優先修正建議</h2>
        <p className="mt-1 text-xs text-amber-900/90">依 review_priority_score 排序；各區塊最多顯示 6 筆。</p>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-rose-200 bg-white/90 p-3">
            <p className="text-xs font-bold text-rose-800">🚨 最優先 · 答案可能有錯</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-800">
              {priorityBuckets.wrong.slice(0, 6).map((it) => (
                <li key={it.question_id}>
                  <Link href={`/admin/question-feedback/${it.question_id}`} className="font-medium text-cyan-800 underline">
                    {shortTitle(it, 48)}
                  </Link>
                  <span className="ml-1 text-slate-500">（prio {Number(it.review_priority_score ?? 0).toFixed(0)}）</span>
                </li>
              ))}
              {priorityBuckets.wrong.length === 0 ? <li className="text-slate-500">目前無</li> : null}
            </ul>
          </div>
          <div className="rounded-lg border border-amber-200 bg-white/90 p-3">
            <p className="text-xs font-bold text-amber-900">⚠️ 次優先 · 不符合影片內容</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-800">
              {priorityBuckets.nr.slice(0, 6).map((it) => (
                <li key={it.question_id}>
                  <Link href={`/admin/question-feedback/${it.question_id}`} className="font-medium text-cyan-800 underline">
                    {shortTitle(it, 48)}
                  </Link>
                </li>
              ))}
              {priorityBuckets.nr.length === 0 ? <li className="text-slate-500">目前無</li> : null}
            </ul>
          </div>
          <div className="rounded-lg border border-yellow-200 bg-white/90 p-3">
            <p className="text-xs font-bold text-yellow-900">🟡 可稍後 · 看不懂／詳解</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-800">
              {priorityBuckets.soft.slice(0, 6).map((it) => (
                <li key={it.question_id}>
                  <Link href={`/admin/question-feedback/${it.question_id}`} className="font-medium text-cyan-800 underline">
                    {shortTitle(it, 48)}
                  </Link>
                </li>
              ))}
              {priorityBuckets.soft.length === 0 ? <li className="text-slate-500">目前無</li> : null}
            </ul>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">審核狀態</p>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-0.5 h-9 w-[200px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <option value="all">全部</option>
            <option value="needs_review">待審（needs_review）</option>
            <option value="hidden">已隱藏</option>
            <option value="normal">一般</option>
            <option value="approved">已核准鎖定</option>
            <option value="regenerated">重產流程中</option>
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">回饋類型</p>
          <select
            value={issue}
            onChange={(e) => setIssue(e.target.value)}
            className="mt-0.5 h-9 w-[220px] rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          >
            <option value="all">不限</option>
            <option value="not_related">不符合影片</option>
            <option value="wrong_answer">答案可能有錯</option>
            <option value="confusing">題目看不懂</option>
            <option value="bad_explanation">詳解不清楚</option>
          </select>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">exam_scope_id</p>
          <input
            value={examScopeId}
            onChange={(e) => setExamScopeId(e.target.value)}
            placeholder="UUID 篩選"
            className="mt-0.5 h-9 w-[260px] rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-800 shadow-sm"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">skill_code</p>
          <input
            value={skillCode}
            onChange={(e) => setSkillCode(e.target.value)}
            className="mt-0.5 h-9 w-[140px] rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-800 shadow-sm"
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">video_id</p>
          <input
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
            className="mt-0.5 h-9 w-[260px] rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-800 shadow-sm"
          />
        </div>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-800 px-3 text-sm font-medium text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
          onClick={() => void load()}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          重新整理
        </button>
      </div>

      {info ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">{info}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{error}</p>
      ) : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          載入中…
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500">目前沒有符合條件的題目統計。</p>
      ) : (
        <ul className="space-y-4">
          {items.map((it) => {
            const bank = it.bank;
            const text = bank?.question_text ?? "（找不到題庫列）";
            const vid = bank?.video_id;
            const busy = busyId === it.question_id;
            const ai = it.ai_confidence_score ?? null;
            const prio = it.review_priority_score ?? null;
            return (
              <li key={it.question_id} className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm font-medium leading-snug">{text}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-slate-700">
                        skill: {bank?.skill_code ?? "—"}
                      </span>
                      <span
                        className={cn(
                          "rounded-md px-2 py-0.5 font-medium",
                          it.review_status === "hidden" && "bg-red-100 text-red-900",
                          it.review_status === "needs_review" && "bg-amber-100 text-amber-900",
                          it.review_status === "approved" && "bg-emerald-100 text-emerald-900",
                          it.review_status === "normal" && "bg-slate-100 text-slate-800",
                          it.review_status === "regenerated" && "bg-violet-100 text-violet-900",
                        )}
                      >
                        {it.review_status}
                      </span>
                      <span>品質 {Number(it.quality_score).toFixed(1)}</span>
                      {ai != null ? <span>AI 可信度 {Number(ai).toFixed(1)}</span> : null}
                      {prio != null ? <span>優先序 {Number(prio).toFixed(0)}</span> : null}
                      <span>
                        👍{it.helpful_count} · 不符{it.not_related_count} · 看不懂{it.confusing_count} · 答案疑
                        {it.wrong_answer_count} · 詳解{it.bad_explanation_count}
                      </span>
                    </div>
                    {it.review_status === "hidden" ? (
                      <p className="text-xs font-medium text-rose-800">已自動隱藏，建議修正或重新生成。</p>
                    ) : null}
                    {it.videoTitle ? <p className="text-xs text-slate-600">影片：{it.videoTitle}</p> : null}
                    {vid ? (
                      <Link
                        href={`/admin/video-tracking/videos/${vid}`}
                        className="inline-block text-xs font-medium text-cyan-700 underline-offset-4 hover:underline"
                      >
                        所屬影片（後台）
                      </Link>
                    ) : null}
                    <Link
                      href={`/admin/question-feedback/${it.question_id}`}
                      className="inline-block text-xs font-medium text-violet-700 underline-offset-4 hover:underline"
                    >
                      查看詳情
                    </Link>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void patchReview(it.question_id, "approved")}
                    >
                      標記已審核
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void patchReview(it.question_id, "needs_review")}
                    >
                      待審
                    </button>
                    <button
                      type="button"
                      className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void patchReview(it.question_id, "hidden")}
                    >
                      隱藏
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void patchReview(it.question_id, "normal")}
                    >
                      恢復
                    </button>
                    <button
                      type="button"
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 underline-offset-2 hover:underline disabled:opacity-50"
                      disabled={busy}
                      onClick={() => void tryRegenerate(it.question_id)}
                    >
                      重新 AI 生成
                    </button>
                  </div>
                </div>
                {it.recentFeedback.length > 0 ? (
                  <div className="mt-3 border-t border-slate-200 pt-3">
                    <p className="mb-2 text-xs font-semibold text-slate-500">近期學生留言</p>
                    <ul className="max-h-40 space-y-1 overflow-y-auto text-xs">
                      {it.recentFeedback.map((f) => (
                        <li key={f.id} className="rounded bg-slate-50 px-2 py-1 text-slate-800">
                          <span className="font-mono text-[10px] text-slate-500">{f.feedback_type}</span>
                          {f.comment ? (
                            <span className="ml-2">{f.comment}</span>
                          ) : (
                            <span className="ml-2 text-slate-500">（無留言）</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
