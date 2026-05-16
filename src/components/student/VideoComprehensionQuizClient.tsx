"use client";

import { useCallback, useEffect, useState } from "react";

type Q = {
  id: string;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  sortOrder: number;
  skillCode: string;
};

function choiceLabel(q: Q, letter: string): string {
  if (letter === "A") return q.choiceA;
  if (letter === "B") return q.choiceB;
  if (letter === "C") return q.choiceC;
  if (letter === "D") return q.choiceD;
  return "";
}

type Feedback = { isCorrect: boolean; explanation: string; correctAnswer: string };

type Props = {
  quizId: string | null;
  unlocked: boolean;
  onPassed?: () => void;
};

const INCOMPLETE_MSG = "此影片的理解測驗尚未建立完成，請稍後再試。";

export function VideoComprehensionQuizClient({ quizId, unlocked, onPassed }: Props) {
  const [loading, setLoading] = useState(Boolean(quizId));
  const [err, setErr] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string>("");
  const [feedbackByQ, setFeedbackByQ] = useState<Record<string, Feedback>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [donePassed, setDonePassed] = useState(false);
  const [failedAttempt, setFailedAttempt] = useState(false);

  const load = useCallback(async () => {
    if (!quizId) {
      setLoading(false);
      setQuestions([]);
      setErr(INCOMPLETE_MSG);
      return;
    }
    if (!unlocked) {
      setLoading(false);
      setQuestions([]);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    const res = await fetch(`/api/quizzes/detail/${quizId}`, { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(
        data.error === "VIDEO_NOT_COMPLETED"
          ? "請先將影片觀看到 90% 以上，再作答影片理解測驗。"
          : data.error === "NOT_FOUND"
            ? INCOMPLETE_MSG
            : "無法載入測驗",
      );
      setQuestions([]);
      setLoading(false);
      return;
    }
    if (data.quizIncomplete) {
      setErr(
        typeof data.incompleteMessage === "string" && data.incompleteMessage.trim()
          ? data.incompleteMessage
          : INCOMPLETE_MSG,
      );
      setQuestions([]);
    } else {
      const qs = (data.questions ?? []) as Q[];
      qs.sort((a, b) => a.sortOrder - b.sortOrder);
      setQuestions(qs);
      setErr(null);
    }
    setStep(0);
    setSelected("");
    setFeedbackByQ({});
    setAnswers({});
    setDonePassed(false);
    setFailedAttempt(false);
    setLoading(false);
  }, [quizId, unlocked]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const current = questions[step];
  const fb = current ? feedbackByQ[current.id] : undefined;
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id]);

  async function confirmChoice() {
    if (!current || !selected || !quizId) return;
    setErr(null);
    const res = await fetch(`/api/quizzes/${quizId}/question-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ questionId: current.id, selectedAnswer: selected }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error === "VIDEO_NOT_COMPLETED" ? "請先將影片觀看到 90% 以上" : "無法取得回饋");
      return;
    }
    setFeedbackByQ((m) => ({
      ...m,
      [current.id]: {
        isCorrect: Boolean(data.isCorrect),
        explanation: String(data.explanation ?? ""),
        correctAnswer: String(data.correctAnswer ?? ""),
      },
    }));
    setAnswers((a) => ({ ...a, [current.id]: selected }));
  }

  async function submitAll() {
    if (!quizId) return;
    setSubmitting(true);
    setErr(null);
    const res = await fetch(`/api/quizzes/${quizId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ answers }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setErr(data.error === "VIDEO_NOT_COMPLETED" ? "請先將影片觀看到 90% 以上" : data.error ?? "提交失敗");
      return;
    }
    if (data.passed) {
      setDonePassed(true);
      setFailedAttempt(false);
      onPassed?.();
    } else {
      setFailedAttempt(true);
      setErr("請回看影片後再試一次");
      setFeedbackByQ({});
      setAnswers({});
      setStep(0);
      setSelected("");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">🧠 影片理解測驗</h2>
      <p className="mt-1 text-sm text-slate-600">共 3 題單選；答對 2 題以上通過。須先將影片觀看達 90% 才可作答。</p>

      {!quizId ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          {INCOMPLETE_MSG}
        </p>
      ) : !unlocked ? (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
          請先觀看影片至 90% 以上，測驗題目將在此顯示並可作答。
        </p>
      ) : loading ? (
        <p className="mt-4 text-sm text-slate-600">載入測驗題目…</p>
      ) : donePassed ? (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-4">
          <p className="text-base font-semibold text-teal-900">✅ 已完成本影片預習</p>
          <p className="mt-1 text-sm text-teal-800">影片理解測驗已通過（3 題中至少答對 2 題）。</p>
        </div>
      ) : questions.length === 0 ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
          {err ?? INCOMPLETE_MSG}
        </p>
      ) : (
        <>
          {err && (
            <p
              className={`mt-4 rounded-lg px-3 py-2 text-sm ${
                failedAttempt ? "border border-rose-200 bg-rose-50 text-rose-900" : "bg-amber-50 text-amber-900"
              }`}
            >
              {err}
            </p>
          )}

          {current && (
            <div className="mt-6 space-y-4">
              <p className="text-sm font-medium text-slate-700">
                第 {step + 1} / {questions.length} 題
              </p>
              <p className="text-base text-slate-900">{current.questionText}</p>
              <div className="space-y-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const text = choiceLabel(current, letter);
                  return (
                    <label
                      key={letter}
                      className="flex cursor-pointer gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50/40"
                    >
                      <input
                        type="radio"
                        name="vcq"
                        value={letter}
                        checked={selected === letter}
                        disabled={Boolean(fb)}
                        onChange={() => setSelected(letter)}
                      />
                      <span>
                        {letter}. {text}
                      </span>
                    </label>
                  );
                })}
              </div>

              {!fb ? (
                <button
                  type="button"
                  disabled={!selected}
                  onClick={() => void confirmChoice()}
                  className="interactive-btn mt-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                >
                  送出
                </button>
              ) : (
                <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
                  <p className={fb.isCorrect ? "font-medium text-teal-800" : "font-medium text-rose-700"}>
                    {fb.isCorrect ? "✓ 正確" : `✗ 錯誤（正確答案：${fb.correctAnswer}）`}
                  </p>
                  {fb.explanation ? (
                    <p className="mt-2 text-slate-700">
                      <span className="font-medium text-slate-800">詳解：</span>
                      {fb.explanation}
                    </p>
                  ) : null}
                  {step < questions.length - 1 ? (
                    <button
                      type="button"
                      className="interactive-btn mt-3 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white"
                      onClick={() => {
                        setStep((s) => s + 1);
                        setSelected("");
                      }}
                    >
                      下一題
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {allAnswered && (
            <div className="mt-8 border-t border-slate-100 pt-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitAll()}
                className="interactive-btn rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {submitting ? "送出中…" : "送出全部答案"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
