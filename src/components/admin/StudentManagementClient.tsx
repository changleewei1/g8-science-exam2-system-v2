"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type Row = {
  id: string;
  studentCode: string;
  name: string;
  className: string | null;
  grade: number;
  passwordStatus: string;
  createdAt: string;
};

export function StudentManagementClient() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [className, setClassName] = useState("801");
  const [grade, setGrade] = useState(8);
  const [seat, setSeat] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    setErr(null);
    const res = await fetch("/api/admin/students", { credentials: "include" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "載入失敗");
      return;
    }
    setRows(data.students ?? []);
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          className,
          grade,
          seat: seat.trim() === "" ? undefined : Number(seat),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "建立失敗");
        return;
      }
      setNotice(
        `已建立：學號 ${data.studentCode}，初始密碼：${data.plainPassword}（請複製保存）`,
      );
      setShowAdd(false);
      setName("");
      setSeat("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErr(null);
    setNotice(null);
    const lines = importText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const parsed: { name: string; className: string; grade: number; seat?: number }[] = [];
    for (const line of lines) {
      const parts = line.split(/[,\t]/).map((p) => p.trim());
      if (parts.length < 3) continue;
      const [n, cls, g, s] = parts;
      parsed.push({
        name: n,
        className: cls,
        grade: Number(g) || 8,
        seat: s ? Number(s) : undefined,
      });
    }
    if (parsed.length === 0) {
      setErr("請貼上 CSV／TSV：姓名,班級,年級[,座號] 每列一筆");
      setSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/admin/students/import", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "匯入失敗");
        return;
      }
      const list = (data.created as { studentCode: string; plainPassword: string }[])
        .map((c) => `${c.studentCode}\t${c.plainPassword}`)
        .join("\n");
      setNotice(`已匯入 ${data.count} 人。帳密對照（請複製）：\n${list}`);
      setShowImport(false);
      setImportText("");
      await load();
    } finally {
      setSubmitting(false);
    }
  }

  async function resetPassword(id: string) {
    if (!confirm("確定重設此學生密碼？舊密碼將失效。")) return;
    setErr(null);
    const res = await fetch(`/api/admin/students/${id}/reset-password`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "重設失敗");
      return;
    }
    setNotice(`新密碼：${data.plainPassword}（請複製給學生）`);
  }

  function exportList() {
    window.location.assign("/api/admin/students/export");
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">學生名單管理</h1>
        <p className="mt-2 text-sm text-slate-600">管理學生帳號、班級與登入資料</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="interactive-btn rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-medium text-white shadow-md"
        >
          新增學生
        </button>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="interactive-btn rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm"
        >
          批次匯入
        </button>
        <button
          type="button"
          onClick={exportList}
          className="interactive-btn rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm"
        >
          匯出帳密清單
        </button>
      </div>

      {notice && (
        <div className="whitespace-pre-wrap rounded-2xl border border-teal-200 bg-teal-50/80 px-4 py-3 text-sm text-teal-950">
          {notice}
        </div>
      )}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {showAdd && (
        <form
          onSubmit={onAdd}
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md space-y-3 max-w-md"
        >
          <h2 className="font-semibold text-slate-900">新增學生</h2>
          <p className="text-xs text-slate-600">
            帳號為 班級+座號兩碼（例 80101），密碼自動為 SciG8-01 格式。座號留空則自動遞增。
          </p>
          <label className="block text-sm">
            <span className="text-slate-700">姓名</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">班級代碼</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">年級</span>
            <input
              type="number"
              min={1}
              max={12}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={grade}
              onChange={(e) => setGrade(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-700">座號（選填）</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={seat}
              onChange={(e) => setSeat(e.target.value)}
              placeholder="自動"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting ? "處理中…" : "建立"}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="text-sm text-slate-600">
              取消
            </button>
          </div>
        </form>
      )}

      {showImport && (
        <form onSubmit={onImport} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-md space-y-3 max-w-2xl">
          <h2 className="font-semibold text-slate-900">批次匯入</h2>
          <p className="text-xs text-slate-600">
            每行一筆：<code className="rounded bg-slate-100 px-1">姓名,班級,年級</code> 或加分隔的座號{" "}
            <code className="rounded bg-slate-100 px-1">姓名,班級,年級,座號</code>
          </p>
          <textarea
            className="w-full min-h-[160px] rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={"陳同學,801,8\n林同學,801,8,5"}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              匯入
            </button>
            <button type="button" onClick={() => setShowImport(false)} className="text-sm text-slate-600">
              取消
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-md">
        <table className="min-w-[800px] w-full text-left text-sm">
          <thead className="bg-slate-100/90">
            <tr>
              <th className="px-4 py-3 font-semibold">學生姓名</th>
              <th className="px-4 py-3 font-semibold">班級</th>
              <th className="px-4 py-3 font-semibold">帳號</th>
              <th className="px-4 py-3 font-semibold">密碼狀態</th>
              <th className="px-4 py-3 font-semibold">建立時間</th>
              <th className="px-4 py-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  載入中…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-600">
                  尚無學生資料
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-3">{r.className ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.studentCode}</td>
                  <td className="px-4 py-3">{r.passwordStatus}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-xs">
                    {r.createdAt
                      ? new Date(r.createdAt).toLocaleString("zh-TW")
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/students/${r.id}/report`}
                        className="text-teal-700 underline text-xs font-medium"
                      >
                        查看學習報告
                      </Link>
                      <button
                        type="button"
                        onClick={() => void resetPassword(r.id)}
                        className="text-xs text-slate-700 underline"
                      >
                        重設密碼
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        「匯出帳密清單」為學號與密碼狀態；明文密碼僅在新增／匯入／重設成功時顯示一次，請妥善保存。
      </p>
    </div>
  );
}
