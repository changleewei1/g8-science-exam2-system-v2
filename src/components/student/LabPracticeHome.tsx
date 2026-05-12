"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SAMPLE_SKILLS = ["RS01", "RS03", "RS06", "CO01"] as const;

export function LabPracticeHome() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function goPractice(trimmed: string) {
    if (!trimmed) return;
    router.push(`/student/lab/practice/${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-900">智慧練習</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          輸入能力代碼後即可進行智慧練習，系統會依答題狀況動態調整難度並更新熟練度。
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-medium text-slate-700">輸入能力代碼（skill_code）</h3>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="例如 RS06"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 sm:max-w-xs"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={() => goPractice(code.trim())}
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            開始練習
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-medium text-slate-700">快速試題（範例代碼）</h3>
        <ul className="mt-4 flex flex-wrap gap-2">
          {SAMPLE_SKILLS.map((s) => (
            <li key={s}>
              <Link
                href={`/student/lab/practice/${s}`}
                className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-teal-900 hover:border-teal-400 hover:bg-teal-50"
              >
                {s}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
