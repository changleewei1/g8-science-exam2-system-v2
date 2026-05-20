"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Home, LogIn, Shield } from "lucide-react";
import { PasswordField } from "@/components/ui/PasswordField";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";

const glassInputClass =
  "min-h-11 w-full rounded-xl border border-slate-200/90 bg-white/80 px-3 py-2.5 text-base text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/60";

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
    <div className="relative min-h-[100dvh]">
      <StudentLightTechBackground />

      <main className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex justify-center sm:justify-start"
        >
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-cyan-200/70 bg-white/85 px-4 py-2.5 text-sm font-semibold text-cyan-900 shadow-[0_4px_20px_-8px_rgba(14,165,233,0.25)] backdrop-blur-sm transition hover:border-cyan-300 hover:bg-white hover:shadow-[0_8px_28px_-8px_rgba(34,211,238,0.3)]"
          >
            <Home className="h-5 w-5 shrink-0 text-cyan-600" aria-hidden />
            回到首頁
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06, duration: 0.45 }}
          className="rounded-3xl border border-cyan-200/60 bg-white/75 p-6 shadow-[0_12px_48px_-16px_rgba(14,165,233,0.28)] backdrop-blur-xl sm:p-8"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-200 bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-700 shadow-inner">
              <Shield className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">老師登入</h1>
              <p className="mt-1 text-sm text-slate-600 sm:text-base">
                請輸入管理密鑰（環境變數 <span className="font-mono text-xs text-slate-700">ADMIN_DASHBOARD_SECRET</span>）
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-5">
            <PasswordField
              label="密鑰"
              value={secret}
              onChange={setSecret}
              autoComplete="off"
              required
              inputClassName={`${glassInputClass} pr-11`}
            />
            {err ? (
              <p className="rounded-2xl border border-rose-200/80 bg-rose-50/90 px-3 py-2.5 text-sm font-medium text-rose-900">
                {err}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 py-3 text-base font-semibold text-white shadow-[0_6px_28px_-6px_rgba(8,145,178,0.55)] transition hover:brightness-105 disabled:pointer-events-none disabled:opacity-55"
            >
              <LogIn className="h-5 w-5 opacity-90" aria-hidden />
              {loading ? "登入中…" : "登入"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
