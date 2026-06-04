"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

type DetailPayload = {
  bank: Record<string, unknown>;
  video: { id: string; title: string; subtitle_text: string | null } | null;
  stats: Record<string, unknown> | null;
  feedback: Array<Record<string, unknown>>;
  skillMeta: Record<string, unknown> | null;
  subtitleSnippet: string | null;
};

export function QuestionFeedbackDetailClient({ questionId }: { questionId: string }) {
  const [data, setData] = useState<DetailPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/admin/question-feedback/${questionId}/detail`, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr((json as { detail?: string }).detail ?? "載入失敗");
      setData(null);
      setLoading(false);
      return;
    }
    setData(json as DetailPayload);
    setLoading(false);
  }, [questionId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        載入題目詳情…
      </div>
    );
  }
  if (err || !data) {
    return <p className="text-sm text-rose-700">{err ?? "無資料"}</p>;
  }

  const bank = data.bank;
  const st = data.stats;

  return (
    <div className="space-y-6 text-sm">
      <div className="flex flex-wrap gap-3">
        <Link href="/admin/question-feedback" className="text-cyan-700 underline">
          ← 返回列表
        </Link>
        <Link href="/admin/question-bank" className="text-violet-700 underline">
          前往題庫管理
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">原題目</h2>
        <p className="mt-2 whitespace-pre-wrap text-slate-800">{String(bank.question_text ?? "")}</p>
        <div className="mt-3 grid gap-1 text-slate-700">
          <p>A. {String(bank.choice_a ?? "")}</p>
          <p>B. {String(bank.choice_b ?? "")}</p>
          <p>C. {String(bank.choice_c ?? "")}</p>
          <p>D. {String(bank.choice_d ?? "")}</p>
        </div>
        <p className="mt-3 font-medium text-emerald-800">正確答案：{String(bank.correct_answer ?? "")}</p>
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="font-medium text-slate-800">詳解</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{String(bank.explanation ?? "（無）")}</p>
        </div>
      </section>

      {data.video ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">所屬影片</h2>
          <p className="mt-1 text-slate-700">{data.video.title}</p>
          <p className="mt-2 font-mono text-xs text-slate-500">video_id: {data.video.id}</p>
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">影片字幕片段</h2>
        <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs text-slate-700">
          {data.subtitleSnippet ?? "（尚無字幕或無法載入）"}
        </p>
      </section>

      {st ? (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">品質統計</h2>
          <ul className="mt-2 space-y-1 text-slate-700">
            <li>quality_score：{String(st.quality_score ?? "—")}</li>
            <li>ai_confidence_score：{String(st.ai_confidence_score ?? "—")}</li>
            <li>review_priority_score：{String(st.review_priority_score ?? "—")}</li>
            <li>review_status：{String(st.review_status ?? "—")}</li>
            <li>total_feedback_count：{String(st.total_feedback_count ?? "—")}</li>
          </ul>
        </section>
      ) : (
        <p className="text-slate-500">尚無品質統計列（尚無學生回饋或尚未重算）。</p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">學生回饋列表</h2>
        <ul className="mt-2 max-h-80 space-y-2 overflow-y-auto">
          {(data.feedback ?? []).map((f) => (
            <li key={String(f.id)} className="rounded border border-slate-100 bg-slate-50/80 px-2 py-2 text-xs">
              <span className="font-mono text-slate-500">{String(f.feedback_type)}</span>
              {f.comment ? <span className="ml-2 text-slate-800">{String(f.comment)}</span> : null}
              <div className="mt-1 text-[10px] text-slate-500">{String(f.created_at)}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
