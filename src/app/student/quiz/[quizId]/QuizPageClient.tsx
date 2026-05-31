"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BrainCircuit, ClipboardList } from "lucide-react";
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
    <label className="flex cursor-pointer gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-3 text-sm shadow-sm transition has-[:checked]:border-cyan-400 has-[:checked]:bg-cyan-50/70 has-[:checked]:shadow-[0_0_16px_-4px_rgba(34,211,238,0.35)]">
      <input type="radio" name={name} value={letter} checked={checked} onChange={onSelect} className="mt-1" />
      <div className="min-w-0 flex-1 space-y-2">
        <span className="font-bold text-slate-900">{letter}.</span>
        {hasImage ? <QuizMediaImage src={imageUrl!} alt="" /> : null}
        {hasText ? <p className="text-slate-800">{text}</p> : null}
        {!hasText && !hasImage ? <span className="text-slate-400">（未設定）</span> : null}
      </div>
    </label>
  );
}

function QuizAnswerProgress({ answered: n, total }: { answered: number; total: number }) {
  const pct = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div className="mb-6">
      <div className="mb-1 flex justify-between text-xs font-semibold text-slate-600">
        <span>作答進度</span>
        <span className="text-cyan-800">
          {n} / {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200/90 ring-1 ring-slate-200/60">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 shadow-[0_0_12px_rgba(6,182,212,0.35)]"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        />
      </div>
    </div>
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

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

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
      if (data.quizIncomplete) {
        setErr(
          typeof data.incompleteMessage === "string" && data.incompleteMessage.trim()
            ? data.incompleteMessage
            : "此影片尚未建立完整測驗題（需至少 3 題已核准並同步）。",
        );
        setQuestions([]);
      } else {
        const raw = (data.questions ?? []) as Q[];
        raw.sort((a, b) => a.sortOrder - b.sortOrder);
        setQuestions(raw);
        setErr(null);
      }
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

  if (loading) {
    return (
      <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6 sm:py-12">
        <p className="rounded-3xl border border-cyan-200/60 bg-white/75 py-16 text-center text-sm font-medium text-slate-600 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.2)] backdrop-blur-xl">
          載入試題…
        </p>
      </main>
    );
  }

  return (
    <main className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-cyan-200/60 bg-white/75 p-4 shadow-[0_8px_32px_-12px_rgba(14,165,233,0.2)] backdrop-blur-xl sm:p-5"
      >
        <StudentBackLink href={backHref}>{backLabel}</StudentBackLink>
      </motion.div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mt-6 rounded-3xl border border-cyan-200/60 bg-white/80 p-5 shadow-[0_8px_40px_-12px_rgba(14,165,233,0.22)] backdrop-blur-xl sm:p-8"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-700">
            <BrainCircuit className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">AI 學習診斷</h1>
            <p className="mt-1 text-sm text-slate-600">
              {questions.length > 0
                ? `共 ${questions.length} 題單選，答對 2 題以上通過`
                : "請依畫面說明與題目完成作答"}
            </p>
          </div>
        </div>

        {questions.length > 0 ? <QuizAnswerProgress answered={answeredCount} total={questions.length} /> : null}

        {err ? (
          <p className="rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm font-medium text-amber-950 shadow-sm">
            {err}
          </p>
        ) : null}

        <ol className="mt-6 space-y-6">
          {questions.map((q, idx) => (
            <li
              key={q.id}
              className="rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur-sm sm:p-5"
            >
              <div className="flex items-center gap-2 text-slate-500">
                <ClipboardList className="h-4 w-4 text-cyan-600" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-wide text-cyan-800/90">第 {idx + 1} 題</span>
              </div>
              <p className="mt-2 font-bold text-slate-900">
                {q.questionText?.trim() ? q.questionText : "（請依圖作答）"}
              </p>
              <p className="mt-1 font-mono text-xs font-medium text-sky-800/90">技能：{q.skillCode}</p>
              {q.questionImageUrl?.trim() ? (
                <div className="mt-3">
                  <QuizMediaImage src={q.questionImageUrl} alt="" />
                </div>
              ) : null}
              {q.referenceImageUrl?.trim() ? (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold text-slate-600">參考圖</p>
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

        {questions.length > 0 ? (
          <div className="mt-8 flex flex-col gap-3 border-t border-cyan-100/60 pt-6 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void submit()}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-6 text-sm font-semibold text-white shadow-[0_4px_24px_-4px_rgba(8,145,178,0.55)] transition hover:brightness-105 sm:flex-initial"
            >
              提交答案
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300/90 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/40"
            >
              上一頁
            </button>
          </div>
        ) : null}
      </motion.section>
    </main>
  );
}
