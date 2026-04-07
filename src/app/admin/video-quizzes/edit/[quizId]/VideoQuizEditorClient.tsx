"use client";

import Link from "next/link";
import { useState } from "react";

export type SkillOption = { code: string; name: string };

export type QuestionFormRow = {
  questionText: string;
  questionImageUrl: string;
  referenceImageUrl: string;
  choiceA: string;
  choiceAImageUrl: string;
  choiceB: string;
  choiceBImageUrl: string;
  choiceC: string;
  choiceCImageUrl: string;
  choiceD: string;
  choiceDImageUrl: string;
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

function ImageUrlBlock({
  label,
  hint,
  value,
  onChange,
  onPickFile,
  uploading,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  onPickFile: (file: File) => void;
  uploading: boolean;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <label className="text-xs text-teal-700">
          <span className="cursor-pointer underline decoration-teal-700/40 underline-offset-2">
            {uploading ? "上傳中…" : "上傳圖片"}
          </span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void onPickFile(f);
            }}
          />
        </label>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
      <input
        type="url"
        inputMode="url"
        placeholder="或貼上圖片網址（https）"
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value.trim() ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="max-h-36 w-full max-w-md rounded border border-slate-200 object-contain"
        />
      ) : null}
    </div>
  );
}

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
  const [uploadKey, setUploadKey] = useState<string | null>(null);

  function field(i: number, key: keyof QuestionFormRow, value: string) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: value } as QuestionFormRow;
      return next;
    });
  }

  async function uploadFor(questionIndex: number, fieldKey: keyof QuestionFormRow, file: File) {
    const key = `${questionIndex}-${String(fieldKey)}`;
    setUploadKey(key);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("quizId", quizId);
      const res = await fetch("/api/admin/quiz-assets/upload", {
        method: "POST",
        credentials: "include",
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.url !== "string") {
        setErrMsg(typeof data.error === "string" ? data.error : "上傳失敗");
        return;
      }
      setRows((prev) => {
        const next = [...prev];
        next[questionIndex] = {
          ...next[questionIndex],
          [fieldKey]: data.url,
        } as QuestionFormRow;
        return next;
      });
      setErrMsg(null);
    } catch {
      setErrMsg("上傳失敗（網路）");
    } finally {
      setUploadKey(null);
    }
  }

  async function onSave() {
    setStatus("saving");
    setErrMsg(null);
    const payload = {
      questions: rows.map((r) => ({
        question_text: r.questionText,
        question_image_url: r.questionImageUrl,
        reference_image_url: r.referenceImageUrl,
        choice_a: r.choiceA,
        choice_a_image_url: r.choiceAImageUrl,
        choice_b: r.choiceB,
        choice_b_image_url: r.choiceBImageUrl,
        choice_c: r.choiceC,
        choice_c_image_url: r.choiceCImageUrl,
        choice_d: r.choiceD,
        choice_d_image_url: r.choiceDImageUrl,
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
        <p className="mt-3 text-xs text-slate-500">
          題幹可只用文字、只用圖、或兩者並列；參考圖附加在題幹下方。每個選項亦可只用文字或只用圖。圖檔建議 5MB
          以內（JPEG／PNG／WebP／GIF）。
        </p>
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
              <span className="text-sm font-medium text-slate-700">題幹文字（可與題幹圖擇一或並用）</span>
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={r.questionText}
                onChange={(e) => field(i, "questionText", e.target.value)}
              />
            </label>

            <ImageUrlBlock
              label="題幹圖"
              hint="顯示在題幹文字下方，作為題目的一部分。"
              value={r.questionImageUrl}
              onChange={(v) => field(i, "questionImageUrl", v)}
              onPickFile={(f) => void uploadFor(i, "questionImageUrl", f)}
              uploading={uploadKey === `${i}-questionImageUrl`}
              disabled={status === "saving"}
            />

            <ImageUrlBlock
              label="參考圖（選填）"
              hint="補充示意、圖表等，顯示在題幹圖之下。"
              value={r.referenceImageUrl}
              onChange={(v) => field(i, "referenceImageUrl", v)}
              onPickFile={(f) => void uploadFor(i, "referenceImageUrl", f)}
              uploading={uploadKey === `${i}-referenceImageUrl`}
              disabled={status === "saving"}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["A", "choiceA", "choiceAImageUrl"],
                  ["B", "choiceB", "choiceBImageUrl"],
                  ["C", "choiceC", "choiceCImageUrl"],
                  ["D", "choiceD", "choiceDImageUrl"],
                ] as const
              ).map(([letter, textKey, imgKey]) => (
                <div key={letter} className="space-y-2 rounded-lg border border-slate-100 p-3">
                  <span className="text-sm font-semibold text-slate-800">選項 {letter}</span>
                  <input
                    type="text"
                    placeholder="選項文字"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={r[textKey]}
                    onChange={(e) => field(i, textKey, e.target.value)}
                  />
                  <ImageUrlBlock
                    label="選項圖"
                    hint="有圖時可搭配短文或留白。"
                    value={r[imgKey]}
                    onChange={(v) => field(i, imgKey, v)}
                    onPickFile={(f) => void uploadFor(i, imgKey, f)}
                    uploading={uploadKey === `${i}-${imgKey}`}
                    disabled={status === "saving"}
                  />
                </div>
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
          disabled={status === "saving" || skillOptions.length === 0 || uploadKey !== null}
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
