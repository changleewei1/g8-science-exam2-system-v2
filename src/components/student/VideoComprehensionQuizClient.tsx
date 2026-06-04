"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Clapperboard, ListVideo } from "lucide-react";

import type { VideoQuizChoicePerm } from "@/lib/student/shuffle-video-quiz-choices";
import { shuffleChoicesForVideoQuiz } from "@/lib/student/shuffle-video-quiz-choices";
import { QuizQuestionQualityFeedback } from "@/components/student/quiz/QuizQuestionQualityFeedback";

type Q = {
  id: string;
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  sortOrder: number;
  skillCode: string;
  questionBankItemId?: string | null;
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
  videoId: string;
  examScopeId?: string | null;
  subjectKey?: string | null;
  onPassed?: () => void;
  /** 完成測驗或想換片時：前往單元影片列表 */
  moreVideosHref?: string;
  moreVideosLabel?: string;
  /** 從任務進入時可選：返回任務頁 */
  taskReturnHref?: string;
  taskReturnLabel?: string;
};

const INCOMPLETE_MSG = "此影片的理解測驗尚未建立完成，請稍後再試。";

function FollowUpNavCard({
  moreVideosHref,
  moreVideosLabel,
  taskReturnHref,
  taskReturnLabel,
}: {
  moreVideosHref?: string;
  moreVideosLabel: string;
  taskReturnHref?: string;
  taskReturnLabel?: string;
}) {
  if (!moreVideosHref && !taskReturnHref) return null;
  return (
    <div className="mt-4 rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-white to-cyan-50/90 p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-800">接下來要做什麼？</p>
      <p className="mt-1 text-xs text-slate-600">可返回單元挑選其他影片，或從任務列表繼續學習。</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        {moreVideosHref ? (
          <Link
            href={moreVideosHref}
            className="flex flex-1 items-center gap-3 rounded-xl border border-cyan-300/80 bg-white px-4 py-3 text-sm font-semibold text-cyan-900 shadow-sm transition hover:border-cyan-400 hover:bg-cyan-50/80"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-100 text-cyan-700">
              <ListVideo className="h-5 w-5" aria-hidden />
            </span>
            <span>{moreVideosLabel}</span>
          </Link>
        ) : null}
        {taskReturnHref ? (
          <Link
            href={taskReturnHref}
            className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Clapperboard className="h-5 w-5" aria-hidden />
            </span>
            <span>{taskReturnLabel ?? "返回學習任務"}</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function VideoComprehensionQuizClient({
  quizId,
  unlocked,
  videoId,
  examScopeId,
  subjectKey,
  onPassed,
  moreVideosHref,
  moreVideosLabel = "返回單元 · 選其他影片",
  taskReturnHref,
  taskReturnLabel,
}: Props) {
  const [loading, setLoading] = useState(Boolean(quizId));
  const [err, setErr] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [choicePermByQuestionId, setChoicePermByQuestionId] = useState<Record<string, VideoQuizChoicePerm>>({});
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
      setChoicePermByQuestionId({});
      setErr(INCOMPLETE_MSG);
      return;
    }
    if (!unlocked) {
      setLoading(false);
      setQuestions([]);
      setChoicePermByQuestionId({});
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
      setChoicePermByQuestionId({});
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
      setChoicePermByQuestionId({});
    } else {
      const qs = (data.questions ?? []) as Q[];
      qs.sort((a, b) => a.sortOrder - b.sortOrder);
      const perms: Record<string, VideoQuizChoicePerm> = {};
      const shuffled = qs.map((q) => {
        const { question, perm } = shuffleChoicesForVideoQuiz(q);
        perms[q.id] = perm;
        return question;
      });
      setChoicePermByQuestionId(perms);
      setQuestions(shuffled);
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
    const perm = choicePermByQuestionId[current.id];
    const originalLetter = perm?.displayToOriginal[selected] ?? selected;
    const res = await fetch(`/api/quizzes/${quizId}/question-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ questionId: current.id, selectedAnswer: originalLetter }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error === "VIDEO_NOT_COMPLETED" ? "請先將影片觀看到 90% 以上" : "無法取得回饋");
      return;
    }
    const apiCorrect = String(data.correctAnswer ?? "")
      .trim()
      .toUpperCase()
      .charAt(0);
    const displayCorrect = perm?.originalToDisplay[apiCorrect] ?? apiCorrect;
    setFeedbackByQ((m) => ({
      ...m,
      [current.id]: {
        isCorrect: Boolean(data.isCorrect),
        explanation: String(data.explanation ?? ""),
        correctAnswer: displayCorrect,
      },
    }));
    setAnswers((a) => ({ ...a, [current.id]: originalLetter }));
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
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-3xl border border-cyan-200/60 bg-white/80 p-4 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.2)] backdrop-blur-xl sm:p-6"
    >
      <div className="flex items-center gap-3 border-b border-cyan-100/60 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-700">
          <Brain className="h-5 w-5" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">影片理解測驗</h2>
          <p className="mt-0.5 text-sm text-slate-600">共 3 題單選；答對 2 題以上通過。須先將影片觀看達 90% 才可作答。</p>
        </div>
      </div>

      {!quizId ? (
        <p className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-950 shadow-sm">
          {INCOMPLETE_MSG}
        </p>
      ) : !unlocked ? (
        <p className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/90 px-4 py-3 text-sm font-medium text-slate-700">
          請先觀看影片至 90% 以上，測驗題目將在此顯示並可作答。
        </p>
      ) : loading ? (
        <p className="mt-4 rounded-2xl border border-cyan-100/80 bg-cyan-50/40 px-4 py-6 text-center text-sm font-medium text-slate-600">
          載入測驗題目…
        </p>
      ) : donePassed ? (
        <div className="mt-4 space-y-1">
          <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-4 shadow-sm">
            <p className="text-base font-bold text-emerald-900">已完成本影片預習</p>
            <p className="mt-1 text-sm text-emerald-800">影片理解測驗已通過（3 題中至少答對 2 題）。</p>
          </div>
          <FollowUpNavCard
            moreVideosHref={moreVideosHref}
            moreVideosLabel={moreVideosLabel}
            taskReturnHref={taskReturnHref}
            taskReturnLabel={taskReturnLabel}
          />
        </div>
      ) : questions.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-950 shadow-sm">
          {err ?? INCOMPLETE_MSG}
        </p>
      ) : (
        <>
          {err && (
            <p
              className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${
                failedAttempt
                  ? "border-rose-200/80 bg-rose-50/90 text-rose-900"
                  : "border-amber-200/80 bg-amber-50/90 text-amber-900"
              }`}
            >
              {err}
            </p>
          )}

          {failedAttempt ? (
            <FollowUpNavCard
              moreVideosHref={moreVideosHref}
              moreVideosLabel={moreVideosLabel}
              taskReturnHref={taskReturnHref}
              taskReturnLabel={taskReturnLabel}
            />
          ) : null}

          {current && (
            <div className="mt-6 space-y-4">
              <p className="text-sm font-semibold text-slate-700">
                第 {step + 1} / {questions.length} 題
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/90">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                />
              </div>
              <p className="text-base text-slate-900">{current.questionText}</p>
              <div className="space-y-2">
                {(["A", "B", "C", "D"] as const).map((letter) => {
                  const text = choiceLabel(current, letter);
                  return (
                    <label
                      key={letter}
                      className="flex cursor-pointer gap-3 rounded-xl border border-slate-200/80 bg-white/60 p-3 text-sm shadow-sm transition has-[:checked]:border-cyan-400 has-[:checked]:bg-cyan-50/70 has-[:checked]:shadow-[0_0_16px_-4px_rgba(34,211,238,0.35)]"
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
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 text-sm font-semibold text-white shadow-[0_4px_20px_-4px_rgba(8,145,178,0.5)] transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-40"
                >
                  送出
                </button>
              ) : (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm backdrop-blur-sm">
                  <p className={fb.isCorrect ? "font-bold text-emerald-800" : "font-bold text-rose-700"}>
                    {fb.isCorrect ? "正確" : `錯誤（正確答案：${fb.correctAnswer}）`}
                  </p>
                  {fb.explanation ? (
                    <p className="mt-2 text-slate-700">
                      <span className="font-medium text-slate-800">詳解：</span>
                      {fb.explanation}
                    </p>
                  ) : null}
                  {current.questionBankItemId ? (
                    <QuizQuestionQualityFeedback
                      questionBankItemId={current.questionBankItemId}
                      videoId={videoId}
                      examScopeId={examScopeId ?? undefined}
                      skillCode={current.skillCode}
                      subjectKey={subjectKey ?? undefined}
                    />
                  ) : null}
                  {step < questions.length - 1 ? (
                    <button
                      type="button"
                      className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/50"
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
            <div className="mt-8 border-t border-cyan-100/60 pt-6">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitAll()}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-6 text-sm font-semibold text-white shadow-[0_4px_24px_-4px_rgba(8,145,178,0.55)] transition hover:brightness-105 disabled:opacity-50"
              >
                {submitting ? "送出中…" : "送出全部答案"}
              </button>
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}
