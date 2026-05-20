"use client";

import Link from "next/link";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import type { HomeAnnouncementPayload } from "@/lib/system-announcement";
import { adminCard, adminNavLink, adminTopHeader } from "@/lib/admin-ui";

type Props = {
  initial: HomeAnnouncementPayload;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-inner outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/60";

export function AnnouncementEditorClient({ initial }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [bodyText, setBodyText] = useState(initial.items.join("\n"));
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSave() {
    setErr(null);
    setMsg(null);
    const items = bodyText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!items.length) {
      setErr("請至少輸入一則有效條目（每行一則）。");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcement", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          items,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "儲存失敗");
        return;
      }
      if (data.announcement?.title) setTitle(data.announcement.title);
      if (Array.isArray(data.announcement?.items)) {
        setBodyText(data.announcement.items.join("\n"));
      }
      setMsg("已儲存。首頁「系統公告」將顯示最新內容。");
    } finally {
      setLoading(false);
    }
  }

  const previewItems = bodyText
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="relative min-h-[100dvh]">
      <header className={adminTopHeader}>
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-3.5 sm:px-6">
          <Link href="/admin" className={`text-sm ${adminNavLink}`}>
            ← 返回後台首頁
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-200/80 bg-cyan-50 text-cyan-700">
              <Megaphone className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">首頁系統公告</h1>
              <p className="text-sm text-slate-500">編輯後即套用至首頁「系統公告」彈窗（每行一則條目）</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className={`p-5 sm:p-6 ${adminCard}`}>
          <label className="block text-sm font-medium text-slate-700">標題</label>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="系統公告"
          />
        </div>

        <div className={`p-5 sm:p-6 ${adminCard}`}>
          <label className="block text-sm font-medium text-slate-700">公告條目</label>
          <p className="mt-1 text-xs text-slate-500">每行一則，空白行會略過。最多 40 則。</p>
          <textarea
            className={`${inputClass} mt-3 min-h-[220px] resize-y leading-relaxed`}
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className={`border-cyan-200/70 bg-cyan-50/80 p-5 sm:p-6 ${adminCard}`}>
          <p className="text-xs font-medium uppercase tracking-wider text-cyan-700">預覽</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{title.trim() || "系統公告"}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-700">
            {previewItems.length ? (
              previewItems.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-cyan-600" aria-hidden>
                    ·
                  </span>
                  <span>{line}</span>
                </li>
              ))
            ) : (
              <li className="text-slate-500">（尚無條目）</li>
            )}
          </ul>
        </div>

        {err ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">{err}</p>
        ) : null}
        {msg ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{msg}</p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onSave}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-6 text-sm font-semibold text-white shadow-md shadow-cyan-500/25 transition hover:brightness-105 disabled:opacity-50"
          >
            {loading ? "儲存中…" : "儲存公告"}
          </button>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200/90 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm hover:border-cyan-300 hover:bg-cyan-50/50"
          >
            開新分頁看首頁
          </Link>
        </div>
      </main>
    </div>
  );
}
