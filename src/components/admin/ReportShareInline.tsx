"use client";

import { useState } from "react";

type Props = {
  studentId: string;
  taskId: string;
};

/** 任務進度表內嵌：產生家長連結 */
export function ReportShareInline({ studentId, taskId }: Props) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function createParentLink() {
    setLoading(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/report-link`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(
          typeof data.detail === "string"
            ? data.detail
            : data.error === "PUBLIC_BASE_URL_MISSING"
              ? "無法產生分享連結：請在部署平台設定 APP_BASE_URL 或 NEXT_PUBLIC_APP_URL。"
              : data.error === "DB_MISSING_TABLE"
                ? "尚未完成系統設定，請先完成初始化後再試"
                : "無法產生連結，請稍後再試",
        );
        return;
      }
      const url = typeof data.shareUrl === "string" ? data.shareUrl : "";
      try {
        await navigator.clipboard.writeText(url);
        setNotice("已複製家長連結");
        setTimeout(() => setNotice(null), 4000);
      } catch {
        setNotice("連結已產生，請手動複製");
        setTimeout(() => setNotice(null), 5000);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <button
        type="button"
        disabled={loading}
        onClick={() => void createParentLink()}
        className="text-left text-xs font-medium text-slate-700 underline decoration-slate-400 underline-offset-2 disabled:opacity-50"
      >
        {loading ? "處理中…" : "產生家長連結"}
      </button>
      {notice ? <span className="text-[10px] text-teal-800">{notice}</span> : null}
      {err ? <span className="text-[10px] text-red-600">{err}</span> : null}
    </span>
  );
}
