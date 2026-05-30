"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import type { AdminTaskVideoPickerUnit } from "@/lib/admin/task-videos-by-exam-scope";
import { cn } from "@/lib/utils";

export type TaskVideoRow = { videoId: string; dayIndex: number };

type ExamScopeOption = { id: string; label: string };

type Props = {
  examScopeOptions: ExamScopeOption[];
  examScopeId: string;
  onExamScopeIdChange: (id: string) => void;
  value: TaskVideoRow[];
  onChange: (rows: TaskVideoRow[]) => void;
};

function buildRowsFromSelection(
  units: AdminTaskVideoPickerUnit[],
  selected: Set<string>,
): TaskVideoRow[] {
  const rows: TaskVideoRow[] = [];
  let day = 1;
  for (const u of units) {
    for (const v of u.videos) {
      if (selected.has(v.videoId)) {
        rows.push({ videoId: v.videoId, dayIndex: day });
        day += 1;
      }
    }
  }
  return rows;
}

function selectionSetFromRows(rows: TaskVideoRow[]): Set<string> {
  return new Set(rows.map((r) => r.videoId));
}

export function TaskVideoPicker({
  examScopeOptions,
  examScopeId,
  onExamScopeIdChange,
  value,
  onChange,
}: Props) {
  const [units, setUnits] = useState<AdminTaskVideoPickerUnit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const selected = useMemo(() => selectionSetFromRows(value), [value]);

  const totalInScope = useMemo(() => (units ? units.reduce((n, u) => n + u.videos.length, 0) : 0), [units]);

  const loadUnits = useCallback(async (scopeId: string) => {
    if (!scopeId) {
      setUnits(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/tasks/videos-by-scope?examScopeId=${encodeURIComponent(scopeId)}`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(typeof data.error === "string" ? data.error : "無法載入影片");
        setUnits(null);
        return;
      }
      setUnits((data.units as AdminTaskVideoPickerUnit[]) ?? []);
      setExpanded(new Set((data.units as AdminTaskVideoPickerUnit[])?.map((u: AdminTaskVideoPickerUnit) => u.unitId) ?? []));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnits(examScopeId);
  }, [examScopeId, loadUnits]);

  const selectedCount = value.length;

  const unitSelectedCount = useCallback(
    (u: AdminTaskVideoPickerUnit) => u.videos.filter((v) => selected.has(v.videoId)).length,
    [selected],
  );

  const toggleExpanded = (unitId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) next.delete(unitId);
      else next.add(unitId);
      return next;
    });
  };

  const expandAll = () => {
    if (!units) return;
    setExpanded(new Set(units.map((u) => u.unitId)));
  };

  const collapseAll = () => setExpanded(new Set());

  const selectAllInScope = () => {
    if (!units) return;
    const next = new Set<string>();
    for (const u of units) for (const v of u.videos) next.add(v.videoId);
    onChange(buildRowsFromSelection(units, next));
  };

  const clearSelection = () => onChange([]);

  const toggleUnit = (u: AdminTaskVideoPickerUnit) => {
    if (!units) return;
    const cnt = unitSelectedCount(u);
    const all = cnt === u.videos.length;
    const next = new Set(selected);
    if (all) {
      for (const v of u.videos) next.delete(v.videoId);
    } else {
      for (const v of u.videos) next.add(v.videoId);
    }
    onChange(buildRowsFromSelection(units, next));
  };

  const toggleVideo = (u: AdminTaskVideoPickerUnit, videoId: string) => {
    if (!units) return;
    const next = new Set(selected);
    if (next.has(videoId)) next.delete(videoId);
    else next.add(videoId);
    onChange(buildRowsFromSelection(units, next));
  };

  const unitCheckboxState = (u: AdminTaskVideoPickerUnit): "checked" | "unchecked" | "indeterminate" => {
    const c = unitSelectedCount(u);
    if (c === 0) return "unchecked";
    if (c === u.videos.length) return "checked";
    return "indeterminate";
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/70 p-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">選擇任務影片</h3>
        <p className="mt-1 text-sm text-slate-500">請先選擇單元，再勾選要指派給學生觀看的影片。</p>
      </div>

      <label className="block max-w-xl text-sm">
        <span className="font-medium text-slate-700">段考範圍</span>
        <select
          className="mt-1.5 w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-slate-900 shadow-sm"
          value={examScopeId}
          onChange={(e) => {
            onExamScopeIdChange(e.target.value);
            onChange([]);
          }}
        >
          <option value="">請選擇段考…</option>
          {examScopeOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3 text-sm">
        <span className="font-medium text-slate-800">
          已選 <span className="text-cyan-700">{selectedCount}</span> / 共 {totalInScope} 支影片
        </span>
        <span className="mx-1 hidden text-slate-300 sm:inline">|</span>
        <button
          type="button"
          onClick={expandAll}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          全部展開
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          全部收合
        </button>
        <button
          type="button"
          onClick={selectAllInScope}
          disabled={!units || totalInScope === 0}
          className="rounded-lg border border-cyan-200 bg-cyan-50 px-2 py-1 text-xs font-medium text-cyan-900 shadow-sm hover:bg-cyan-100 disabled:opacity-40"
        >
          全選目前段考影片
        </button>
        <button
          type="button"
          onClick={clearSelection}
          disabled={selectedCount === 0}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
        >
          清空選取
        </button>
      </div>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      {loading ? <p className="text-sm text-slate-500">載入影片清單中…</p> : null}

      {!loading && examScopeId && units && units.length === 0 ? (
        <p className="text-sm text-amber-800">此段考尚未掛載單元或影片。</p>
      ) : null}

      {units && units.length > 0 ? (
        <ul className="space-y-2">
          {units.map((u) => {
            const isOpen = expanded.has(u.unitId);
            const ucState = unitCheckboxState(u);
            const selN = unitSelectedCount(u);
            return (
              <li
                key={u.unitId}
                className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    ref={(el) => {
                      if (el) el.indeterminate = ucState === "indeterminate";
                    }}
                    checked={ucState === "checked"}
                    onChange={() => toggleUnit(u)}
                    aria-label={`全選單元 ${u.unitTitle}`}
                  />
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => toggleExpanded(u.unitId)}
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
                    )}
                    <Layers className="h-4 w-4 shrink-0 text-cyan-600" aria-hidden />
                    <span className="truncate font-semibold text-slate-900">{u.unitTitle}</span>
                  </button>
                  <span className="shrink-0 text-xs text-slate-500">
                    已選 {selN} / {u.videos.length} 支
                  </span>
                </div>
                {isOpen ? (
                  <ul className="divide-y divide-slate-100">
                    {u.videos.map((v) => (
                      <li key={v.videoId} className="flex flex-wrap items-center gap-3 px-3 py-2 sm:flex-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 shrink-0 rounded border-slate-300"
                          checked={selected.has(v.videoId)}
                          onChange={() => toggleVideo(u, v.videoId)}
                          disabled={!v.isActive}
                        />
                        <span className="w-8 shrink-0 text-center font-mono text-xs text-slate-400">{v.displayIndex}</span>
                        <span className={cn("min-w-0 flex-1 text-sm", !v.isActive && "text-slate-400 line-through")}>
                          {v.title}
                          {!v.isActive ? "（已停用）" : ""}
                        </span>
                        <span className="flex shrink-0 gap-2 text-[11px] font-medium">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5",
                              v.hasQuiz ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {v.hasQuiz ? "有測驗" : "無測驗"}
                          </span>
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5",
                              v.hasSkillTags ? "bg-sky-50 text-sky-800" : "bg-slate-100 text-slate-500",
                            )}
                          >
                            {v.hasSkillTags ? "已連結 skill" : "未連結 skill"}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
