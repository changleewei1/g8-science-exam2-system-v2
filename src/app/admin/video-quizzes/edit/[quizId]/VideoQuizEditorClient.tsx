"use client";

import Link from "next/link";
import { useState } from "react";

export type SkillOption = { code: string; name: string };

export type QuestionFormRow = {
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: string;
  skillCode: string;
};

type Props = {
  quizId: string;
  quizTitle: string;
  videoTitle: string;
  initialRows: QuestionFormRow[];
  skillOptions: SkillOption[];
};

export function VideoQuizEditorClient({
  quizId,
  quizTitle,
  videoTitle,
  initialRows,
  skillOptions,
}: Props) {
  const [rows, setRows] = useState<QuestionFormRow[]>(initialRows);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const field = (i: number, key: keyof QuestionFormRow, value: string) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[i], [key]: value };
      next[i] = row as QuestionFormRow;
      return next;
    });
  };

  async function onSave() {
    setStatus("saving");
    setErrMsg(null);
    const payload = {
      questions: rows.map((r) => ({
        question_text: r.questionText.trim(),
        choice_a: r.choiceA.trim(),
        choice_b: r.choiceB.trim(),
        choice_c: r.choiceC.trim(),
        choice_d: r.choiceD.trim(),
        correct_answer: r.correctAnswer,
        explanation: r.explanation.trim() || null,
        difficulty: r.difficulty.trim() || null,
        skill_code: r.skillCode.trim(),
      })),
    };

    try {
      const res = await fetch(`/api/admin/quizzes/${quizId}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("err");
        setErrMsg(typeof data.error === "string" ? data.error : "儲存失敗");
        return;
      }
      setStatus("ok");
    } catch {
      setStatus("err");
      setErrMsg("網路錯誤");
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/video-quizzes"
          className="interactive-nav text-sm font-medium text-teal-700 underline underline-offset-2"
        >
          ← 返回測驗題列表
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-slate-900">編輯測驗</h1>
        <p className="mt-1 text-sm text-slate-600">測驗：{quizTitle}</p>
        <p className="mt-1 text-sm text-slate-700">影片：{videoTitle}</p>
        <p className="mt-3 text-xs text-slate-500">每部影片固定 3 題單選；通過門檻由測驗設定決定（預設答對 2 題）。</p>
      </div>

      {status === "ok" && (
        <p className="rounded-lg bg-teal-50 px-4 py-3 text-sm text-teal-900">
          已儲存成功（學生端將讀取新題目）。
        </p>
      )}
      {errMsg && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-900">{errMsg}</p>
      )}

      <div className="space-y-10">
        {rows.map((r, i) => (
          <fieldset
            key={i}
            className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <legend className="px-1 text-base font-semibold text-slate-900">第 {i + 1} 題</legend>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">題幹</span>
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={r.questionText}
                onChange={(e) => field(i, "questionText", e.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["choiceA", "選項 A"],
                  ["choiceB", "選項 B"],
                  ["choiceC", "選項 C"],
                  ["choiceD", "選項 D"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="block space-y-1">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={r[k]}
                    onChange={(e) => field(i, k, e.target.value)}
                  />
                </label>
              ))}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">正解</legend>
              <div className="flex flex-wrap gap-4">
                {(["A", "B", "C", "D"] as const).map((k) => (
                  <label key={k} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={r.correctAnswer === k}
                      onChange={() => field(i, "correctAnswer", k)}
                    />
                    {k}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">解析（選填）</span>
              <textarea
                className="min-h-[60px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={r.explanation}
                onChange={(e) => field(i, "explanation", e.target.value)}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">難度（選填）</span>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  placeholder="例如：基礎"
                  value={r.difficulty}
                  onChange={(e) => field(i, "difficulty", e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">技能代碼</span>
                <select
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  value={r.skillCode}
                  onChange={(e) => field(i, "skillCode", e.target.value)}
                >
                  {skillOptions.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void onSave()}
          disabled={status === "saving" || skillOptions.length === 0}
          className="interactive-btn rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === "saving" ? "儲存中…" : "儲存變更"}
        </button>
        <Link
          href="/admin/video-quizzes"
          className="inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700"
        >
          取消
        </Link>
      </div>
    </div>
  );
}
