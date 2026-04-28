"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type VideoOption = { id: string; label: string };

type Row = { videoId: string; dayIndex: number };

type StudentOpt = { id: string; name: string; studentCode: string; className: string | null };

type Props = {
  videos: VideoOption[];
  editTaskId?: string;
};

export function TaskCreateForm({ videos, editTaskId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endDateTouched, setEndDateTouched] = useState(false);
  const [className, setClassName] = useState("");
  const [assignmentMode, setAssignmentMode] = useState<"class" | "students">("class");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentOptions, setStudentOptions] = useState<StudentOpt[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [rows, setRows] = useState<Row[]>([{ videoId: videos[0]?.id ?? "", dayIndex: 1 }]);
  const [loading, setLoading] = useState(false);
  const [loadEdit, setLoadEdit] = useState(!!editTaskId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/students", { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (res.ok && Array.isArray(data.students)) {
          setStudentOptions(data.students as StudentOpt[]);
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  useEffect(() => {
    if (!editTaskId || videos.length === 0) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/admin/tasks/${editTaskId}`, { credentials: "include" });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.task) return;
        if (cancelled) return;
        const t = data.task;
        setTitle(t.title);
        setDescription(t.description ?? "");
        setStartDate(t.startDate);
        setEndDate(t.endDate);
        setEndDateTouched(true);
        setClassName(t.className);
        setIsActive(t.isActive !== false);
        if (t.assignmentMode === "students" && Array.isArray(t.assigneeStudentIds)) {
          setAssignmentMode("students");
          setSelectedStudentIds(t.assigneeStudentIds);
        } else {
          setAssignmentMode("class");
          setSelectedStudentIds([]);
        }
        const vids = data.videos as { videoId: string; dayIndex: number }[];
        if (vids.length > 0) {
          setRows(
            vids.map((x) => ({
              videoId: x.videoId,
              dayIndex: x.dayIndex,
            })),
          );
        }
      } finally {
        if (!cancelled) setLoadEdit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editTaskId, videos.length]);

  useEffect(() => {
    if (!startDate) return;
    if (endDateTouched) return;
    const d = new Date(`${startDate}T12:00:00`);
    d.setDate(d.getDate() + 7);
    const next = d.toISOString().slice(0, 10);
    setEndDate(next);
  }, [startDate, endDateTouched]);

  function addRow() {
    setRows((r) => [...r, { videoId: videos[0]?.id ?? "", dayIndex: 1 }]);
  }

  function updateRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, j) => j !== i));
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload = {
        title,
        description: description || null,
        startDate,
        endDate,
        className,
        assignmentMode,
        studentIds: assignmentMode === "students" ? selectedStudentIds : [],
        isActive,
        videos: rows.filter((x) => x.videoId),
      };
      const res = await fetch(editTaskId ? `/api/admin/tasks/${editTaskId}` : "/api/admin/tasks", {
        method: editTaskId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        let msg: string =
          typeof data.error === "string"
            ? data.error
            : editTaskId
              ? "無法儲存設定，請稍後再試"
              : "無法建立學習任務，請稍後再試";
        if (data.error === "UNAUTHORIZED") {
          msg = "登入已過期，請重新登入老師後台後再試。";
        } else if (data.error === "VALIDATION_ERROR" && data.details?.fieldErrors) {
          const fe = data.details.fieldErrors as Record<string, string[] | undefined>;
          const first = Object.entries(fe).find(([, arr]) => arr && arr.length);
          if (first) msg = `${first[0]}：${first[1]![0]}`;
        }
        setError(msg);
        return;
      }
      if (editTaskId) {
        router.push(`/admin/tasks/${editTaskId}`);
      } else {
        router.push(`/admin/tasks/${data.id}?created=1`);
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (loadEdit) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600 shadow-md">
        載入任務資料…
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-5 text-sm text-amber-950 shadow-sm">
        <p className="font-medium text-slate-900">資料庫中尚無影片資料</p>
        <p className="mt-2 text-slate-700">
          學習任務須綁定影片。請先以播放清單匯入後，再建立任務。
        </p>
        <ul className="mt-3 list-inside list-disc space-y-1 text-slate-800">
          <li>
            <Link
              href="/admin/help/learning-setup"
              className="font-medium text-teal-800 underline underline-offset-2"
            >
              學習系統與匯入設定說明
            </Link>
          </li>
        </ul>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md sm:p-8"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {editTaskId ? "編輯學習任務" : "新增學習任務"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          請設定本次需完成的影片學習內容與期限；建立後系統將依觀看進度自動更新任務完成狀態。
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">任務名稱</span>
          <input
            required
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm"
            placeholder="例：酸鹼中和預習任務"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-800">任務說明</span>
          <textarea
            className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-slate-900 shadow-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例：請於上課前完成指定影片觀看與測驗"
          />
        </label>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <legend className="text-sm font-medium text-slate-800">指派對象</legend>
        <p className="text-xs text-slate-500">選擇需完成此任務的學生或班級（班級名稱請與學生名冊一致）</p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="am"
              checked={assignmentMode === "class"}
              onChange={() => setAssignmentMode("class")}
            />
            整班（依班級）
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="am"
              checked={assignmentMode === "students"}
              onChange={() => setAssignmentMode("students")}
            />
            指定學生（可複選）
          </label>
        </div>
        {assignmentMode === "class" ? (
          <label className="block text-sm">
            <span className="text-slate-700">班級</span>
            <input
              required
              className="mt-1.5 w-full max-w-md rounded-xl border border-slate-300 px-3 py-2.5 shadow-sm"
              placeholder="例如：801"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </label>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-sm">
            {studentOptions.length === 0 ? (
              <p className="text-slate-500">載入學生名冊中…若為空，請先至「學生名單管理」新增學生。</p>
            ) : (
              <ul className="space-y-2">
                {studentOptions.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(s.id)}
                        onChange={() => toggleStudent(s.id)}
                      />
                      <span>
                        {s.name}{" "}
                        <span className="font-mono text-xs text-slate-500">({s.studentCode})</span>
                        {s.className ? ` · ${s.className}` : ""}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </fieldset>

      <div>
        <div className="mb-1">
          <span className="font-medium text-slate-800">完成期限</span>
          <p className="text-xs text-slate-500">系統將依此時間統計完成狀況</p>
        </div>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-600">開始日期</span>
            <input
              required
              type="date"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 shadow-sm"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
              }}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-600">完成期限</span>
            <input
              required
              type="date"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 shadow-sm"
              value={endDate}
              onChange={(e) => {
                setEndDateTouched(true);
                setEndDate(e.target.value);
              }}
            />
          </label>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-800">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        立即啟用（關閉時學生端將不顯示此任務）
      </label>

      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
        <div className="mb-2">
          <span className="font-medium text-slate-800">學習內容（影片）</span>
          <p className="text-xs text-slate-500">學生需完成觀看的影片內容；請設定觀看順序（第幾天）</p>
        </div>
        <div className="mb-3 flex items-center justify-end">
          <button
            type="button"
            onClick={addRow}
            className="interactive-nav rounded-lg px-2 py-1 text-sm font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-2"
          >
            新增影片
          </button>
        </div>
        <ul className="space-y-3">
          {rows.map((row, i) => (
            <li
              key={i}
              className="flex flex-wrap items-end gap-2 rounded-lg bg-white/90 p-3 ring-1 ring-slate-200/80"
            >
              <label className="min-w-[220px] flex-1 text-sm">
                <span className="text-slate-600">影片（單元 · 名稱）</span>
                <select
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                  value={row.videoId}
                  onChange={(e) => updateRow(i, { videoId: e.target.value })}
                >
                  {videos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="w-32 text-sm">
                <span className="text-slate-600">順序（第幾天）</span>
                <input
                  required
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2"
                  value={row.dayIndex}
                  onChange={(e) => updateRow(i, { dayIndex: Number(e.target.value) || 1 })}
                />
              </label>
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="interactive-nav mb-1 rounded-md px-2 py-1 text-sm font-medium text-red-600 underline decoration-red-600/40 underline-offset-2"
                >
                  移除
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="interactive-btn rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-medium text-white shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "處理中…" : editTaskId ? "儲存設定" : "建立學習任務"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/tasks")}
          className="interactive-btn rounded-xl border border-slate-300 bg-white px-6 py-2.5 text-sm font-medium text-slate-800 shadow-sm"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) router.back();
            else router.push("/admin/tasks");
          }}
          className="interactive-btn rounded-xl border border-slate-200 bg-slate-50 px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
        >
          返回任務列表
        </button>
      </div>
    </form>
  );
}
