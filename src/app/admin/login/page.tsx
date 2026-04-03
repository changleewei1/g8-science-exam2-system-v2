"use client";

import { useState } from "react";
import { HomeBackLink } from "@/components/ui/HomeBackLink";
import { PasswordField } from "@/components/ui/PasswordField";

export default function AdminLoginPage() {
  const [secret, setSecret] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "admin", adminSecret: secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.error === "SERVER_MISCONFIGURED" && typeof data.detail === "string") {
          setErr(data.detail);
          return;
        }
        if (res.status === 503) {
          setErr("系統暫時無法使用，請稍後再試或聯絡管理員。");
          return;
        }
        setErr("密鑰錯誤");
        return;
      }
      window.location.assign("/admin");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mb-6 flex justify-center sm:justify-start">
        <HomeBackLink />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">老師登入</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          請輸入管理密鑰（環境變數 ADMIN_DASHBOARD_SECRET）
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <PasswordField
            label="密鑰"
            value={secret}
            onChange={setSecret}
            autoComplete="off"
            required
            inputClassName="min-h-11 w-full rounded-lg border border-slate-300 py-2.5 pl-3 pr-11 text-base text-slate-900 outline-none ring-slate-400 focus:ring-2"
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="interactive-btn min-h-12 w-full rounded-lg bg-slate-900 py-3 text-base font-medium text-white disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? "登入中…" : "登入"}
          </button>
        </form>
      </div>
    </main>
  );
}
