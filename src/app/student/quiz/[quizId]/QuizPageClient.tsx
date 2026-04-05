"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { useEffect, useMemo, useState } from "react";

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
              {idx + 1}. {q.questionText}
            </p>
            <p className="mt-1 text-xs text-slate-500">技能：{q.skillCode}</p>
            <div className="mt-3 space-y-2">
              {(
                [
                  ["A", q.choiceA],
                  ["B", q.choiceB],
                  ["C", q.choiceC],
                  ["D", q.choiceD],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={q.id}
                    value={k}
                    checked={answers[q.id] === k}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: k }))}
                  />
                  <span>
                    {k}. {label}
                  </span>
                </label>
              ))}
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
