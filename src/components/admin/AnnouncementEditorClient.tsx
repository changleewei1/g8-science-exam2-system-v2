"use client";

import Link from "next/link";
import { useState } from "react";
import { Megaphone } from "lucide-react";
import type { HomeAnnouncementPayload } from "@/lib/system-announcement";

type Props = {
  initial: HomeAnnouncementPayload;
};

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
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#050810] text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-10%,#1e3a5f_0%,#0a0f1f_50%,#050810_100%)]"
        aria-hidden
      />

      <header className="relative border-b border-white/10 bg-slate-950/50 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 px-4 py-4 sm:px-6">
          <Link
            href="/admin"
            className="text-sm font-medium text-cyan-400/90 underline-offset-4 hover:text-cyan-300 hover:underline"
          >
            ← 返回後台首頁
          </Link>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-200">
              <Megaphone className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <h1 className="text-xl font-bold text-white">首頁系統公告</h1>
              <p className="text-sm text-slate-400">編輯後即套用至首頁「系統公告」彈窗（每行一則條目）</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
          <label className="block text-sm font-medium text-slate-300">標題</label>
          <input
            className="mt-2 w-full rounded-xl border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            placeholder="系統公告"
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-md sm:p-6">
          <label className="block text-sm font-medium text-slate-300">公告條目</label>
          <p className="mt-1 text-xs text-slate-500">每行一則，空白行會略過。最多 40 則。</p>
          <textarea
            className="mt-3 min-h-[220px] w-full resize-y rounded-xl border border-white/15 bg-slate-950/60 px-3 py-3 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            spellCheck={false}
          />
        </div>

        <div className="rounded-2xl border border-cyan-500/25 bg-cyan-950/20 p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-cyan-300/80">預覽</p>
          <h2 className="mt-2 text-lg font-semibold text-cyan-100">{title.trim() || "系統公告"}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-300">
            {previewItems.length ? (
              previewItems.map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-cyan-500/80" aria-hidden>
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
          <p className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">{err}</p>
        ) : null}
        {msg ? (
          <p className="rounded-xl border border-emerald-500/35 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">
            {msg}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onSave}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 px-6 text-sm font-semibold text-white shadow-[0_0_28px_rgba(34,211,238,0.35)] transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "儲存中…" : "儲存公告"}
          </button>
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 text-sm font-medium text-slate-200 hover:border-cyan-400/40 hover:bg-white/10"
          >
            開新分頁看首頁
          </Link>
        </div>
      </main>
    </div>
  );
}
