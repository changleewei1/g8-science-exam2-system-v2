"use client";

import { useState } from "react";

export type QuestionCand = {
  id: string;
  skill_code: string;
  difficulty: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  status: string;
};

export function EditableQuestionCandidateCard(props: {
  q: QuestionCand;
  onPatch: (p: Record<string, unknown>) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const { q } = props;
  const [text, setText] = useState(q.question_text);
  const [a, setA] = useState(q.choice_a);
  const [b, setB] = useState(q.choice_b);
  const [c, setC] = useState(q.choice_c);
  const [d, setD] = useState(q.choice_d);
  const [ans, setAns] = useState(q.correct_answer);
  const [exp, setExp] = useState(q.explanation ?? "");
  async function approve() {
    await props.onPatch({ action: "approve" });
    await props.onReload();
  }
  async function reject() {
    await props.onPatch({ action: "reject" });
    await props.onReload();
  }
  async function save() {
    await props.onPatch({
      question_text: text,
      choice_a: a,
      choice_b: b,
      choice_c: c,
      choice_d: d,
      correct_answer: ans.toUpperCase() as "A" | "B" | "C" | "D",
      explanation: exp,
      action: "update",
    });
    await props.onReload();
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-mono text-slate-600">
        {q.skill_code} · {q.difficulty}
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-2 w-full rounded border px-2 py-1 text-sm" rows={2} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input value={a} onChange={(e) => setA(e.target.value)} className="rounded border px-2 py-1 text-xs" placeholder="A" />
        <input value={b} onChange={(e) => setB(e.target.value)} className="rounded border px-2 py-1 text-xs" placeholder="B" />
        <input value={c} onChange={(e) => setC(e.target.value)} className="rounded border px-2 py-1 text-xs" placeholder="C" />
        <input value={d} onChange={(e) => setD(e.target.value)} className="rounded border px-2 py-1 text-xs" placeholder="D" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <select value={ans} onChange={(e) => setAns(e.target.value)} className="rounded border px-2 py-1 text-sm">
          {(["A", "B", "C", "D"] as const).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <textarea value={exp} onChange={(e) => setExp(e.target.value)} className="mt-2 w-full rounded border px-2 py-1 text-sm" rows={2} placeholder="詳解" />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => void save()} className="rounded-lg border bg-white px-3 py-1 text-xs font-medium">
          儲存修改
        </button>
        <button type="button" onClick={() => void approve()} className="rounded-lg bg-teal-700 px-3 py-1 text-xs font-medium text-white">
          核准入題庫
        </button>
        <button type="button" onClick={() => void reject()} className="rounded-lg border px-3 py-1 text-xs text-rose-700">
          拒絕
        </button>
      </div>
    </div>
  );
}
