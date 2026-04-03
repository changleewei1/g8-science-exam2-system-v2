"use client";

import { useState } from "react";
import { HomeBackLink } from "@/components/ui/HomeBackLink";
import { PasswordField } from "@/components/ui/PasswordField";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({
          role: "student",
          studentCode: code,
          password,
        }),
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
        setErr(data.error === "LOGIN_FAILED" ? "帳號或密碼錯誤，或帳號停用" : "登入失敗");
        return;
      }
      // 完整導向：避免手機 Safari 在 fetch 後立即 client-side 導覽時 Cookie 尚未生效
      window.location.assign("/student/dashboard");
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
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">學生登入</h1>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">請輸入帳號（學號）與密碼</p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">帳號（學號）</label>
            <input
              className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base text-slate-900 outline-none ring-teal-500 focus:ring-2"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="例：80121（請輸入數字學號，勿填姓名）"
              autoComplete="username"
              inputMode="numeric"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              系統以<strong className="font-medium text-slate-700">學號</strong>驗證身分，與密碼組合需與學校提供的一致。
            </p>
          </div>
          <PasswordField
            label="密碼"
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            hint={
              <p className="text-xs text-slate-500">
                未設定密碼的示範帳號可只填學號登入。
              </p>
            }
          />
          {err && <p className="text-sm text-red-600">{err}</p>}
          <button
            type="submit"
            disabled={loading}
            className="interactive-btn min-h-12 w-full rounded-lg bg-teal-600 py-3 text-base font-medium text-white disabled:pointer-events-none disabled:opacity-60"
          >
            {loading ? "登入中…" : "登入"}
          </button>
        </form>
      </div>
    </main>
  );
}
