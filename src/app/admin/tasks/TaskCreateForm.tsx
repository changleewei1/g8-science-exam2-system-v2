"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TaskVideoPicker, type TaskVideoRow } from "@/components/admin/TaskVideoPicker";

type StudentOpt = { id: string; name: string; studentCode: string; className: string | null };

type Props = {
  examScopeOptions: { id: string; label: string }[];
  editTaskId?: string;
};

export function TaskCreateForm({ examScopeOptions, editTaskId }: Props) {
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
  const [examScopeId, setExamScopeId] = useState("");
  const [videoRows, setVideoRows] = useState<TaskVideoRow[]>([]);
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
    if (!editTaskId) return;
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
        if (typeof t.examScopeId === "string" && t.examScopeId) {
          setExamScopeId(t.examScopeId);
        }
        if (t.assignmentMode === "students" && Array.isArray(t.assigneeStudentIds)) {
          setAssignmentMode("students");
          setSelectedStudentIds(t.assigneeStudentIds);
        } else {
          setAssignmentMode("class");
          setSelectedStudentIds([]);
        }
        const vids = data.videos as { videoId: string; dayIndex: number }[];
        if (vids.length > 0) {
          setVideoRows(
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
  }, [editTaskId]);

  useEffect(() => {
    if (!startDate) return;
    if (endDateTouched) return;
    const d = new Date(`${startDate}T12:00:00`);
    d.setDate(d.getDate() + 7);
    const next = d.toISOString().slice(0, 10);
    setEndDate(next);
  }, [startDate, endDateTouched]);

  function handleExamScopeChange(next: string) {
    setExamScopeId((prev) => {
      if (prev !== "" && prev !== next) {
        setVideoRows([]);
      }
      return next;
    });
  }

  function toggleStudent(id: string) {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!examScopeId.trim()) {
      setError("請選擇段考範圍。");
      return;
    }
    if (videoRows.length === 0) {
      setError("請至少勾選一支影片。");
      return;
    }
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
        examScopeId: examScopeId || null,
        videos: videoRows,
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
      <div className="rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-8 text-center text-slate-400 shadow-md">
        載入任務資料…
      </div>
    );
  }

  if (examScopeOptions.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-5 text-sm text-amber-950 shadow-sm">
        <p className="font-medium text-slate-900">尚無段考範圍資料</p>
        <p className="mt-2 text-slate-600">請先於後台建立並啟用段考範圍後，再建立學習任務。</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-6 shadow-md sm:p-8"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          {editTaskId ? "編輯學習任務" : "新增學習任務"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          請設定本次需完成的影片學習內容與期限；建立後系統將依觀看進度自動更新任務完成狀態。
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">任務名稱</span>
          <input
            required
            className="mt-1.5 w-full rounded-xl border border-slate-200/90 px-3 py-2.5 text-slate-900 shadow-sm"
            placeholder="例：酸鹼中和預習任務"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">任務說明</span>
          <textarea
            className="mt-1.5 w-full rounded-xl border border-slate-200/90 px-3 py-2.5 text-slate-900 shadow-sm"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="例：請於上課前完成指定影片觀看與測驗"
          />
        </label>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
        <legend className="text-sm font-medium text-slate-700">指派對象</legend>
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
            <span className="text-slate-600">班級</span>
            <input
              required
              className="mt-1.5 w-full max-w-md rounded-xl border border-slate-200/90 px-3 py-2.5 shadow-sm"
              placeholder="例如：801"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
            />
          </label>
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-3 text-sm">
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
          <span className="font-medium text-slate-700">完成期限</span>
          <p className="text-xs text-slate-500">系統將依此時間統計完成狀況</p>
        </div>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-slate-400">開始日期</span>
            <input
              required
              type="date"
              className="mt-1.5 w-full rounded-xl border border-slate-200/90 px-3 py-2.5 shadow-sm"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
              }}
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">完成期限</span>
            <input
              required
              type="date"
              className="mt-1.5 w-full rounded-xl border border-slate-200/90 px-3 py-2.5 shadow-sm"
              value={endDate}
              onChange={(e) => {
                setEndDateTouched(true);
                setEndDate(e.target.value);
              }}
            />
          </label>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        立即啟用（關閉時學生端將不顯示此任務）
      </label>

      <TaskVideoPicker
        examScopeOptions={examScopeOptions}
        examScopeId={examScopeId}
        onExamScopeIdChange={handleExamScopeChange}
        value={videoRows}
        onChange={setVideoRows}
      />

      {videoRows.length === 0 ? (
        <p className="text-sm text-amber-800">請至少勾選一支影片。</p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="interactive-btn rounded-xl bg-cyan-600 px-6 py-2.5 text-sm font-medium text-white shadow-md disabled:pointer-events-none disabled:opacity-50"
        >
          {loading ? "處理中…" : editTaskId ? "儲存設定" : "建立學習任務"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/tasks")}
          className="interactive-btn rounded-xl border border-slate-200/90 bg-white px-6 py-2.5 text-sm font-medium text-slate-700 shadow-sm"
        >
          取消
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined" && window.history.length > 1) router.back();
            else router.push("/admin/tasks");
          }}
          className="interactive-btn rounded-xl border border-slate-200/80 bg-slate-50/70 px-6 py-2.5 text-sm font-medium text-slate-600 shadow-sm"
        >
          返回任務列表
        </button>
      </div>
    </form>
  );
}
