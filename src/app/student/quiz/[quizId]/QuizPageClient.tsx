"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { QuizMediaImage } from "@/components/student/QuizMediaImage";
import { useEffect, useMemo, useState } from "react";

type Q = {
  id: string;
  questionText: string;
  questionImageUrl: string | null;
  referenceImageUrl: string | null;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  choiceAImageUrl: string | null;
  choiceBImageUrl: string | null;
  choiceCImageUrl: string | null;
  choiceDImageUrl: string | null;
  sortOrder: number;
  skillCode: string;
};

function useQuizReturnContext() {
  const searchParams = useSearchParams();
  return useMemo(() => {
    const from = searchParams.get("from")?.toLowerCase() ?? "";
    const taskId = searchParams.get("taskId");
    const unitId = searchParams.get("unitId");
    const fromTask = from === "task";
    let backHref = "/student/dashboard";
    let backLabel = "返回學習總覽";
    if (fromTask) {
      backHref = `/student/tasks${taskId ? `?taskId=${encodeURIComponent(taskId)}` : ""}`;
      backLabel = "返回學習任務";
    } else if (unitId) {
      backHref = `/student/unit/${unitId}`;
      backLabel = "返回單元影片";
    }
    return { fromTask, taskId, backHref, backLabel };
  }, [searchParams]);
}

function ChoiceRow({
  letter,
  text,
  imageUrl,
  name,
  checked,
  onSelect,
}: {
  letter: string;
  text: string;
  imageUrl: string | null;
  name: string;
  checked: boolean;
  onSelect: () => void;
}) {
  const hasImage = Boolean(imageUrl?.trim());
  const hasText = Boolean(text.trim());
  return (
    <label className="flex cursor-pointer gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-sm has-[:checked]:border-teal-400 has-[:checked]:bg-teal-50/40">
      <input type="radio" name={name} value={letter} checked={checked} onChange={onSelect} className="mt-1" />
      <div className="min-w-0 flex-1 space-y-2">
        <span className="font-medium text-slate-900">{letter}.</span>
        {hasImage ? <QuizMediaImage src={imageUrl!} alt="" /> : null}
        {hasText ? <p className="text-slate-800">{text}</p> : null}
        {!hasText && !hasImage ? <span className="text-slate-400">（未設定）</span> : null}
      </div>
    </label>
  );
}

export default function QuizPageClient() {
  const params = useParams();
  const quizId = params.quizId as string;
  const router = useRouter();
  const { fromTask, taskId, backHref, backLabel } = useQuizReturnContext();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      const res = await fetch(`/api/quizzes/detail/${quizId}`, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          data.error === "VIDEO_NOT_COMPLETED"
            ? "請先將影片觀看到 90% 以上"
            : "無法載入測驗",
        );
        setQuestions([]);
        setLoading(false);
        return;
      }
      setQuestions(data.questions ?? []);
      setLoading(false);
    }
    void load();
  }, [quizId]);

  async function submit() {
    setErr(null);
    const res = await fetch(`/api/quizzes/${quizId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ answers }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(data.error ?? "提交失敗");
      return;
    }
    const q = new URLSearchParams();
    if (fromTask) {
      q.set("from", "task");
      if (taskId) q.set("taskId", taskId);
    }
    const suffix = q.toString() ? `?${q.toString()}` : "";
    router.push(`/student/quiz-result/${data.attemptId}${suffix}`);
  }

  if (loading) return <p className="p-8 text-center text-slate-600">載入試題…</p>;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <StudentBackLink href={backHref}>{backLabel}</StudentBackLink>
      </div>
      <h1 className="text-xl font-semibold text-slate-900">AI學習診斷</h1>
      <p className="mt-1 text-sm text-slate-500">共 3 題單選，答對 2 題以上通過</p>
      {err && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{err}</p>
      )}
      <ol className="mt-8 space-y-8">
        {questions.map((q, idx) => (
          <li key={q.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-medium text-slate-900">
              {idx + 1}. {q.questionText?.trim() ? q.questionText : "（請依圖作答）"}
            </p>
            <p className="mt-1 text-xs text-slate-500">技能：{q.skillCode}</p>
            {q.questionImageUrl?.trim() ? (
              <div className="mt-3">
                <QuizMediaImage src={q.questionImageUrl} alt="" />
              </div>
            ) : null}
            {q.referenceImageUrl?.trim() ? (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-slate-600">參考圖</p>
                <QuizMediaImage src={q.referenceImageUrl} alt="" />
              </div>
            ) : null}
            <div className="mt-4 space-y-2">
              <ChoiceRow
                letter="A"
                text={q.choiceA}
                imageUrl={q.choiceAImageUrl}
                name={q.id}
                checked={answers[q.id] === "A"}
                onSelect={() => setAnswers((a) => ({ ...a, [q.id]: "A" }))}
              />
              <ChoiceRow
                letter="B"
                text={q.choiceB}
                imageUrl={q.choiceBImageUrl}
                name={q.id}
                checked={answers[q.id] === "B"}
                onSelect={() => setAnswers((a) => ({ ...a, [q.id]: "B" }))}
              />
              <ChoiceRow
                letter="C"
                text={q.choiceC}
                imageUrl={q.choiceCImageUrl}
                name={q.id}
                checked={answers[q.id] === "C"}
                onSelect={() => setAnswers((a) => ({ ...a, [q.id]: "C" }))}
              />
              <ChoiceRow
                letter="D"
                text={q.choiceD}
                imageUrl={q.choiceDImageUrl}
                name={q.id}
                checked={answers[q.id] === "D"}
                onSelect={() => setAnswers((a) => ({ ...a, [q.id]: "D" }))}
              />
            </div>
          </li>
        ))}
      </ol>
      {questions.length > 0 && (
        <>
          <div className="mt-8 flex gap-4">
            <button
              type="button"
              onClick={() => void submit()}
              className="interactive-btn rounded-lg bg-teal-600 px-5 py-2.5 font-medium text-white"
            >
              提交答案
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="interactive-btn rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
            >
              上一頁
            </button>
          </div>
        </>
      )}
    </main>
  );
}
