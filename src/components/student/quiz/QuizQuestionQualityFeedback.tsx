"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { DEFAULT_SUBJECT_KEY } from "@/lib/subject-defaults";

export type FeedbackType = "helpful" | "not_related" | "confusing" | "wrong_answer" | "bad_explanation";

type Props = {
  questionBankItemId: string;
  videoId?: string | null;
  skillCode?: string | null;
  examScopeId?: string | null;
  /** 跨科模組化；未傳則使用預設 */
  subjectKey?: string | null;
};

const OPTIONS: { type: FeedbackType; label: string; emoji: string }[] = [
  { type: "helpful", label: "符合影片內容", emoji: "👍" },
  { type: "not_related", label: "不符合影片內容", emoji: "👎" },
  { type: "confusing", label: "題目看不懂", emoji: "⚠️" },
  { type: "wrong_answer", label: "答案可能有錯", emoji: "✏️" },
  { type: "bad_explanation", label: "詳解不清楚", emoji: "📄" },
];

export function QuizQuestionQualityFeedback({
  questionBankItemId,
  videoId,
  skillCode,
  examScopeId,
  subjectKey,
}: Props) {
  const [selected, setSelected] = useState<FeedbackType | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [hadSavedBefore, setHadSavedBefore] = useState(false);
  const [showThanks, setShowThanks] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/student/question-feedback?questionId=${encodeURIComponent(questionBankItemId)}`,
          { credentials: "include" },
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data?.hasFeedback) {
          const t = String(data.feedbackType ?? "") as FeedbackType;
          if (OPTIONS.some((o) => o.type === t)) {
            setSelected(t);
            setComment(typeof data.comment === "string" ? data.comment : "");
            setHadSavedBefore(true);
          }
        }
      } catch {
        /* 略過 */
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questionBankItemId]);

  const send = useCallback(
    async (type: FeedbackType) => {
      setSending(true);
      setErr(null);
      try {
        const res = await fetch("/api/student/question-feedback", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: questionBankItemId,
            videoId: videoId ?? undefined,
            skillCode: skillCode ?? undefined,
            examScopeId: examScopeId ?? undefined,
            subjectKey: (subjectKey ?? "").trim() || DEFAULT_SUBJECT_KEY,
            feedbackType: type,
            comment: comment.trim() || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const payload = data as { error?: string; detail?: string };
          const msg =
            typeof payload.detail === "string" && payload.detail.trim()
              ? `${payload.error ?? "錯誤"}：${payload.detail}`
              : typeof payload.error === "string"
                ? payload.error
                : "送出失敗";
          setErr(msg);
          return;
        }
        setSelected(type);
        setHadSavedBefore(true);
        setShowThanks(true);
        window.setTimeout(() => setShowThanks(false), 4500);
      } catch {
        setErr("網路錯誤");
      } finally {
        setSending(false);
      }
    },
    [comment, examScopeId, questionBankItemId, skillCode, subjectKey, videoId],
  );

  if (!loaded) {
    return (
      <p className="mt-4 text-xs text-slate-500" aria-hidden>
        載入回饋狀態…
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-3 text-sm">
      {hadSavedBefore ? (
        <p className="mb-2 text-xs font-medium text-slate-600">你已回饋此題；若要修改請重新選擇並送出（不會重複新增紀錄）。</p>
      ) : null}
      {showThanks ? (
        <p className="mb-2 rounded-lg border border-teal-200/80 bg-teal-50/80 px-3 py-2 text-sm text-teal-900">
          謝謝回饋，我們會持續優化題目。
        </p>
      ) : null}
      <p className="font-medium text-slate-800">這題是否符合影片內容？</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.type}
            type="button"
            disabled={sending}
            onClick={() => void send(o.type)}
            className={cn(
              "inline-flex min-h-9 items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition sm:text-sm",
              selected === o.type
                ? "border-teal-500 bg-teal-100 text-teal-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50/60",
            )}
          >
            <span aria-hidden>{o.emoji}</span>
            {o.label}
          </button>
        ))}
      </div>
      <label className="mt-3 block text-xs text-slate-600">
        <span className="font-medium text-slate-700">請簡單說明問題（選填）</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxLength={2000}
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-800 shadow-inner outline-none focus:border-teal-400"
          placeholder="例如：影片沒有提到這個觀念、答案好像不對、詳解看不懂"
        />
      </label>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
