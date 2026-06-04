"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PracticeQuestionCard } from "@/components/student/PracticeQuestionCard";
import { PracticeResourcePanel } from "@/components/student/PracticeResourcePanel";
import { PracticeStatusPanel } from "@/components/student/PracticeStatusPanel";
import { QuizQuestionQualityFeedback } from "@/components/student/quiz/QuizQuestionQualityFeedback";

type Choices = { A: string; B: string; C: string; D: string };

type ApiErr = { error?: string; message?: string };

type StartOk = { session_id: string; score: number; difficulty: string; streak: number };

type QuestionOk = { question_id: string; question_text: string; choices: Choices };

type AnswerOk = {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  score: number;
  difficulty: string;
  streak: number;
  is_mastered: boolean;
};

type ChoiceKey = "A" | "B" | "C" | "D";

function readApiError(payload: unknown): string {
  if (payload && typeof payload === "object" && "message" in payload && typeof (payload as ApiErr).message === "string") {
    return (payload as ApiErr).message!;
  }
  return "發生錯誤，請稍後再試。";
}

type AdaptivePracticeSessionProps = {
  skillCode: string;
  skillLabel: string;
  /** 段考範圍 id（由技能樹進入時帶入，供題目回饋） */
  examScopeId?: string | null;
  subjectKey?: string;
  /** 預設：智慧練習 API */
  apiBase?: string;
  /** 預設：學習總覽（個人總覽區塊） */
  backHref?: string;
};

export function AdaptivePracticeSession(props: AdaptivePracticeSessionProps) {
  const {
    skillCode,
    skillLabel,
    examScopeId,
    subjectKey,
    apiBase = "/api/lab/practice",
    backHref = "/student/dashboard",
  } = props;
  const returnLabel = backHref.includes("/student/exam-scope/") ? "返回技能樹練習" : "回到學習總覽";

  const [fatalError, setFatalError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [score, setScore] = useState(50);
  const [difficulty, setDifficulty] = useState("基礎");
  const [streak, setStreak] = useState(0);
  const [mastered, setMastered] = useState(false);

  const [questionLoading, setQuestionLoading] = useState(false);
  const [question, setQuestion] = useState<QuestionOk | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);

  const [phase, setPhase] = useState<"boot" | "answering" | "feedback">("boot");
  const [lastAnswer, setLastAnswer] = useState<AnswerOk | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<ChoiceKey | null>(null);
  const [submittedAnswer, setSubmittedAnswer] = useState<ChoiceKey | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const loadQuestion = useCallback(async (sid: string) => {
    setQuestionLoading(true);
    setQuestionError(null);
    setQuestion(null);
    setSelectedAnswer(null);
    setSubmittedAnswer(null);
    try {
      const res = await fetch(`${apiBase}/question?session_id=${encodeURIComponent(sid)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setQuestionError(readApiError(data));
        return;
      }
      setQuestion(data as QuestionOk);
      setPhase("answering");
    } catch {
      setQuestionError("網路不穩定，請檢查連線後再試。");
    } finally {
      setQuestionLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/start`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ skill_code: skillCode }),
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setFatalError(readApiError(data));
          return;
        }
        const ok = data as StartOk;
        setSessionId(ok.session_id);
        setScore(ok.score);
        setDifficulty(ok.difficulty);
        setStreak(ok.streak ?? 0);
        setAnsweredCount(0);
        setCorrectCount(0);
        setElapsedSeconds(0);
        await loadQuestion(ok.session_id);
      } catch {
        if (!cancelled) setFatalError("無法連線到伺服器，請稍後再試。");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [skillCode, loadQuestion, apiBase]);

  async function submitCurrentAnswer() {
    if (!sessionId || !question || submitting || !selectedAnswer) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${apiBase}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          session_id: sessionId,
          question_id: question.question_id,
          answer: selectedAnswer,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setQuestionError(readApiError(data));
        setSubmitting(false);
        return;
      }
      const ans = data as AnswerOk;
      setSubmittedAnswer(selectedAnswer);
      setLastAnswer(ans);
      setScore(ans.score);
      setDifficulty(ans.difficulty);
      setStreak(ans.streak);
      setMastered(ans.is_mastered);
      setAnsweredCount((prev) => prev + 1);
      if (ans.is_correct) {
        setCorrectCount((prev) => prev + 1);
      }
      setPhase("feedback");
    } catch {
      setQuestionError("送出答案時發生錯誤，請再試一次。");
    } finally {
      setSubmitting(false);
    }
  }

  async function nextQuestion() {
    if (!sessionId || mastered) return;
    setLastAnswer(null);
    setSubmittedAnswer(null);
    await loadQuestion(sessionId);
  }

  async function restart() {
    setFatalError(null);
    setQuestionError(null);
    setMastered(false);
    setLastAnswer(null);
    setPhase("boot");
    setQuestion(null);
    setSessionId(null);
    setSelectedAnswer(null);
    setSubmittedAnswer(null);
    try {
      const res = await fetch(`${apiBase}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ skill_code: skillCode }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setFatalError(readApiError(data));
        return;
      }
      const ok = data as StartOk;
      setSessionId(ok.session_id);
      setScore(ok.score);
      setDifficulty(ok.difficulty);
      setStreak(ok.streak ?? 0);
      setAnsweredCount(0);
      setCorrectCount(0);
      setElapsedSeconds(0);
      await loadQuestion(ok.session_id);
    } catch {
      setFatalError("無法重新開始，請稍後再試。");
    }
  }

  function challengeStageFromScore(v: number): string {
    if (v >= 90) return "精熟達成";
    if (v >= 75) return "衝刺階段";
    if (v >= 60) return "穩定進步";
    return "暖身起步";
  }

  if (fatalError) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
        <p className="font-medium">無法開始智慧練習</p>
        <p className="mt-2 text-sm">{fatalError}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href={backHref} className="text-sm font-medium text-teal-800 underline">
            返回上一頁
          </Link>
        </div>
      </div>
    );
  }

  if (mastered && phase === "feedback" && lastAnswer?.is_mastered) {
    return (
      <div className="space-y-6">
        <PracticeStatusPanel
          answeredCount={answeredCount}
          correctCount={correctCount}
          score={score}
          difficulty={difficulty}
          elapsedSeconds={elapsedSeconds}
          challengeStage={challengeStageFromScore(score)}
          streak={streak}
        />
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50 to-white p-8 text-center shadow-sm">
          <p className="text-4xl" aria-hidden>
            🎉
          </p>
          <h2 className="mt-4 text-xl font-semibold text-emerald-900">已達精熟！</h2>
          <p className="mt-2 text-emerald-800">你已掌握這個觀念，熟練度達到 {score} / 100。</p>
          <p className="mt-4 text-sm text-slate-600">建議：仍可定時複習，讓能力更穩固。</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void restart()}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              完成練習後再練一次
            </button>
            <Link
              href={backHref}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              {returnLabel}
            </Link>
          </div>
        </div>
        <PracticeResourcePanel
          onPracticeNext={() => void restart()}
          isMastered
          skillCode={skillCode}
          returnHref={backHref}
          returnLabel={returnLabel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {questionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {questionError}
          {sessionId && (
            <button
              type="button"
              className="mt-3 block text-sm font-medium text-rose-800 underline"
              onClick={() => void loadQuestion(sessionId)}
            >
              重新載入題目
            </button>
          )}
        </div>
      )}

      {questionLoading && !question && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-600 shadow-sm">載入題目中…</p>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div className="space-y-5">
          {question ? (
            <PracticeQuestionCard
              contextText={`情境提醒：先看清楚題目中的關鍵字，再對照 ${skillLabel} 的核心概念。`}
              questionText={question.question_text}
              choices={question.choices}
              selectedAnswer={selectedAnswer}
              submittedAnswer={submittedAnswer}
              correctAnswer={lastAnswer?.correct_answer}
              disabled={submitting || questionLoading}
              onSelect={(choice) => setSelectedAnswer(choice)}
              onSubmit={() => void submitCurrentAnswer()}
            />
          ) : null}

          {phase === "feedback" && lastAnswer ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {lastAnswer.is_correct ? (
                <>
                  <p className="font-semibold text-emerald-700">✔ 正確，觀念掌握得不錯！</p>
                  <p className="mt-1 text-slate-800">保持節奏，再完成幾題就能進入更高挑戰。</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-rose-700">❌ 本題答錯了</p>
                  <p className="mt-1 text-slate-800">
                    正確答案：<span className="font-semibold">{lastAnswer.correct_answer}</span>
                  </p>
                </>
              )}

              <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-800">
                <p className="font-medium text-slate-700">詳解說明</p>
                <p className="mt-2 whitespace-pre-wrap">
                  {lastAnswer.explanation || "本題暫無詳解，建議先回看影片並再做一次類似題。"}
                </p>
              </div>

              {question ? (
                <QuizQuestionQualityFeedback
                  questionBankItemId={question.question_id}
                  skillCode={skillCode}
                  examScopeId={examScopeId ?? undefined}
                  subjectKey={subjectKey}
                />
              ) : null}

              {!lastAnswer.is_mastered ? (
                <button
                  type="button"
                  onClick={() => void nextQuestion()}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-3 text-base font-semibold text-white hover:bg-teal-800 sm:w-auto sm:min-w-44"
                >
                  下一題
                </button>
              ) : null}
            </section>
          ) : null}
        </div>

        <PracticeStatusPanel
          answeredCount={answeredCount}
          correctCount={correctCount}
          score={score}
          difficulty={difficulty}
          elapsedSeconds={elapsedSeconds}
          challengeStage={challengeStageFromScore(score)}
          streak={streak}
        />
      </div>

      <PracticeResourcePanel
        onPracticeNext={() => {
          if (sessionId && !mastered) {
            void nextQuestion();
            return;
          }
          void restart();
        }}
        isMastered={mastered}
        skillCode={skillCode}
        returnHref={backHref}
        returnLabel={returnLabel}
      />
    </div>
  );
}
