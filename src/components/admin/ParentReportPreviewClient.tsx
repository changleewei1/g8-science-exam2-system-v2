"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { adminTopHeader, adminTopHeaderInner } from "@/lib/admin-ui";

type StudentRow = {
  id: string;
  name: string;
  className: string | null;
};

type ExamScopeOpt = { id: string; title: string };

export function ParentReportPreviewClient() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [scopes, setScopes] = useState<ExamScopeOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [classFilter, setClassFilter] = useState<string>("");
  const [studentId, setStudentId] = useState("");
  const [scopeId, setScopeId] = useState("");
  const [teacherMessage, setTeacherMessage] = useState("");
  const [html, setHtml] = useState<string | null>(null);
  const [previewTo, setPreviewTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const [stRes, cfgRes] = await Promise.all([
      fetch("/api/admin/students", { credentials: "include" }),
      fetch("/api/admin/report-settings", { credentials: "include" }),
    ]);
    const stData = await stRes.json().catch(() => ({}));
    const cfgData = await cfgRes.json().catch(() => ({}));
    if (!stRes.ok) {
      setErr(typeof stData.error === "string" ? stData.error : "載入學生失敗");
      return;
    }
    const raw = (stData.students ?? []) as {
      id: string;
      name: string;
      className: string | null;
    }[];
    setStudents(
      raw.map((r) => ({
        id: r.id,
        name: r.name,
        className: r.className,
      })),
    );
    if (cfgRes.ok && cfgData.ok && Array.isArray(cfgData.examScopes)) {
      setScopes(cfgData.examScopes as ExamScopeOpt[]);
      const first = (cfgData.examScopes as ExamScopeOpt[])[0];
      if (first?.id) setScopeId((s) => s || first.id);
    }
  }, []);

  useEffect(() => {
    void load().finally(() => setLoading(false));
  }, [load]);

  const classes = useMemo(() => {
    const s = new Set<string>();
    for (const r of students) {
      const c = (r.className ?? "").trim() || "未分班";
      s.add(c);
    }
    return [...s].sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (!classFilter) return students;
    return students.filter((r) => ((r.className ?? "").trim() || "未分班") === classFilter);
  }, [students, classFilter]);

  async function onPreview() {
    if (!studentId || !scopeId) {
      setErr("請選擇學生與段考範圍。");
      return;
    }
    setPreviewing(true);
    setErr(null);
    setNotice(null);
    setHtml(null);
    try {
      const res = await fetch("/api/admin/parent-report/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          scopeId,
          teacherMessage: teacherMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(typeof data.message === "string" ? data.message : "預覽失敗");
        return;
      }
      setHtml(data.html as string);
      setPreviewTo(typeof data.previewMeta?.toEmail === "string" ? data.previewMeta.toEmail : null);
      setNotice("已產生預覽。");
    } finally {
      setPreviewing(false);
    }
  }

  async function onSend() {
    if (!studentId || !scopeId) {
      setErr("請選擇學生與段考範圍。");
      return;
    }
    setSending(true);
    setErr(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/parent-report/send", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          scopeId,
          teacherMessage: teacherMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setErr(typeof data.message === "string" ? data.message : "寄送失敗");
        return;
      }
      setNotice(`已寄至家長信箱：${data.to}`);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-slate-600">
        <p>載入中…</p>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50/80 pb-16">
      <header className={adminTopHeader}>
        <div className={adminTopHeaderInner}>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin/report-settings" className="text-sm font-medium text-cyan-700 hover:text-cyan-900">
              ← 報表設定
            </Link>
            <span className="hidden h-6 w-px bg-cyan-200/70 sm:block" aria-hidden />
            <div>
              <p className="text-xs font-medium uppercase tracking-widest text-cyan-600/90">家長信</p>
              <h1 className="text-lg font-bold text-slate-900 sm:text-xl">家長版摘要預覽／寄送</h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 sm:text-sm">僅寄給該生 parent_email；內容不含其他學生或後台連結。</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        {err ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
        ) : null}
        {notice ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {notice}
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-medium text-slate-600">班級</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={classFilter}
                onChange={(e) => {
                  setClassFilter(e.target.value);
                  setStudentId("");
                }}
              >
                <option value="">全部班級</option>
                {classes.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">學生</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
              >
                <option value="">請選擇</option>
                {filteredStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.className ? `（${s.className}）` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600">段考範圍</label>
              <select
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={scopeId}
                onChange={(e) => setScopeId(e.target.value)}
              >
                {scopes.length === 0 ? (
                  <option value="">無可用段考</option>
                ) : (
                  scopes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2 sm:flex-row">
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
                disabled={previewing}
                onClick={() => void onPreview()}
              >
                {previewing ? "預覽中…" : "預覽"}
              </button>
              <Button type="button" disabled={sending} onClick={() => void onSend()}>
                {sending ? "寄送中…" : "寄給家長"}
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-medium text-slate-600">老師提醒文字（選填，須在報表設定勾選「老師提醒」區塊）</label>
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              value={teacherMessage}
              onChange={(e) => setTeacherMessage(e.target.value)}
              placeholder="例如：請今晚先完成推薦影片，明天課堂會抽查。"
            />
          </div>
          {previewTo ? (
            <p className="mt-2 text-xs text-slate-500">
              預覽用收件欄位：{previewTo}
              {previewTo.startsWith("(") ? " — 請至學生資料補上 parent_email 後再寄送。" : ""}
            </p>
          ) : null}
        </section>

        {html ? (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600">預覽</p>
            <iframe title="家長信預覽" className="h-[720px] w-full border-0 bg-white" srcDoc={html} />
          </section>
        ) : null}
      </main>
    </div>
  );
}
