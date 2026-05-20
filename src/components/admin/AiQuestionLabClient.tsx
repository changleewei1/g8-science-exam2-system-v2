"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditableQuestionCandidateCard, type QuestionCand } from "@/components/admin/EditableQuestionCandidateCard";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "@/lib/exam3-scope";

const PAGE_SIZE = 36;
const GEN_TIMEOUT_MS = 125_000;
const BATCH_CHUNK_DELAY_MS = 1000;
const MAX_RETRIES = 3;

type VideoLabRow = {
  id: string;
  title: string;
  youtube_url: string;
  youtube_video_id: string;
  unit_title: string;
  exam_scope_title: string;
  sort_order: number;
  is_active: boolean;
  management_status: string;
  status_label: string;
  skill_codes: string[];
  question_count_via_skills: number;
  draft_candidate_count: number;
};

type SkillCand = {
  id: string;
  suggested_skill_code: string;
  suggested_skill_name: string | null;
  confidence: number | null;
  reason: string | null;
};

type GenUiState = {
  videoId: string;
  label: string;
  pct: number;
  done: boolean;
};

type BatchRowState = {
  status: "waiting" | "running" | "done" | "error";
  pct: number;
  label: string;
  error?: string;
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithTimeout(
  input: RequestInfo,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function ProgressBar({ pct, success }: { pct: number; success?: boolean }) {
  const w = Math.max(0, Math.min(100, pct));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span>進度</span>
        <span className="font-mono font-medium text-slate-700">{Math.round(w)}%</span>
      </div>
      <div
        className={`relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200/90 ${
          success ? "ring-1 ring-emerald-300/80" : ""
        }`}
      >
        <div
          className={`qgen-shimmer relative h-full rounded-full transition-[width] duration-500 ease-out ${
            success
              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
              : "bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-400"
          }`}
          style={{ width: `${w}%` }}
        />
      </div>
    </div>
  );
}

export function AiQuestionLabClient() {
  const [videos, setVideos] = useState<VideoLabRow[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [openAiConfigured, setOpenAiConfigured] = useState<boolean | null>(null);
  const [subtitleDraft, setSubtitleDraft] = useState("");
  const [focusedVideoId, setFocusedVideoId] = useState<string | null>(null);
  const [skillCand, setSkillCand] = useState<SkillCand[]>([]);
  const [qCand, setQCand] = useState<QuestionCand[]>([]);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);
  const [genUi, setGenUi] = useState<GenUiState | null>(null);
  const genTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchRows, setBatchRows] = useState<Record<string, BatchRowState>>({});
  const [batchSummary, setBatchSummary] = useState<{ ok: number; fail: number } | null>(null);

  const displayed = useMemo(() => videos.slice(0, visibleCount), [videos, visibleCount]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const qs = new URLSearchParams({ exam_scope_id: G8_SPRING_TERM_EXAM3_SCOPE_ID });
      const [envRes, vidRes] = await Promise.all([
        fetch("/api/admin/ai-env-status", { credentials: "include" }),
        fetch(`/api/admin/videos?${qs.toString()}`, { credentials: "include" }),
      ]);
      const envData = await envRes.json().catch(() => ({}));
      setOpenAiConfigured(envRes.ok ? Boolean(envData.openAiConfigured) : null);
      const data = await vidRes.json().catch(() => ({}));
      if (!vidRes.ok) {
        setErr(data.error ?? "無法載入影片");
        setVideos([]);
        return;
      }
      setVideos((data.videos ?? []) as VideoLabRow[]);
      setVisibleCount(PAGE_SIZE);
    } catch {
      setErr("無法載入影片");
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const reloadFocus = useCallback(async (videoId: string) => {
    const [rs, rq] = await Promise.all([
      fetch(`/api/admin/video-skill-candidates?status=pending&videoId=${encodeURIComponent(videoId)}`, {
        credentials: "include",
      }),
      fetch(`/api/admin/generated-question-candidates?status=draft&videoId=${encodeURIComponent(videoId)}`, {
        credentials: "include",
      }),
    ]);
    const js = await rs.json().catch(() => null);
    const jq = await rq.json().catch(() => null);
    setSkillCand((js?.candidates ?? []) as SkillCand[]);
    setQCand((jq?.items ?? []) as QuestionCand[]);
  }, []);

  useEffect(() => {
    if (focusedVideoId) void reloadFocus(focusedVideoId);
  }, [focusedVideoId, reloadFocus]);

  function clearGenTick() {
    if (genTickRef.current) {
      clearInterval(genTickRef.current);
      genTickRef.current = null;
    }
  }

  function startGenSimulation(videoId: string) {
    clearGenTick();
    const phases = [
      "正在分析字幕…",
      "正在比對 skill tree…",
      "正在呼叫 AI…",
      "正在生成第 1/3 題…",
      "正在生成第 2/3 題…",
      "正在生成第 3/3 題…",
      "正在寫入候選題庫…",
    ];
    let step = 0;
    setGenUi({ videoId, label: phases[0]!, pct: 8, done: false });
    genTickRef.current = setInterval(() => {
      step += 1;
      const idx = Math.min(phases.length - 1, Math.floor(step / 2));
      const pct = Math.min(92, 10 + step * 6);
      setGenUi({ videoId, label: phases[idx]!, pct, done: false });
    }, 650);
  }

  async function analyze(videoId: string) {
    setBusyVideoId(videoId);
    try {
      const res = await fetch(`/api/admin/videos/${videoId}/analyze-skills`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual_subtitle: subtitleDraft.trim() || undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErr(data?.message ?? data?.error ?? "分析失敗");
        return;
      }
      setErr(null);
      await load();
      if (focusedVideoId === videoId) await reloadFocus(videoId);
    } finally {
      setBusyVideoId(null);
    }
  }

  async function genQs(videoId: string) {
    if (openAiConfigured === false) return;
    setBusyVideoId(videoId);
    startGenSimulation(videoId);
    try {
      const res = await fetchWithTimeout(
        `/api/admin/videos/${videoId}/generate-questions`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            manual_subtitle: subtitleDraft.trim() || undefined,
            per_skill: 3,
          }),
        },
        GEN_TIMEOUT_MS,
      );
      const data = await res.json().catch(() => ({}));
      clearGenTick();
      if (!res.ok) {
        setGenUi({ videoId, label: data?.message ?? data?.error ?? "生成失敗", pct: 100, done: true });
        setErr(data?.message ?? data?.error ?? "生成失敗");
        setTimeout(() => setGenUi(null), 2200);
        return;
      }
      setErr(null);
      setGenUi({ videoId, label: "完成！", pct: 100, done: true });
      const inserted = Number(data.inserted ?? 3) || 0;
      setVideos((vs) =>
        vs.map((v) =>
          v.id === videoId
            ? {
                ...v,
                draft_candidate_count: v.draft_candidate_count + inserted,
              }
            : v,
        ),
      );
      await load();
      if (focusedVideoId === videoId) await reloadFocus(videoId);
      setTimeout(() => setGenUi(null), 1400);
    } catch (e) {
      clearGenTick();
      const aborted = e instanceof Error && e.name === "AbortError";
      setGenUi({
        videoId,
        label: aborted ? "逾時，請稍後再試" : "發生錯誤",
        pct: 100,
        done: true,
      });
      setErr(aborted ? "請求逾時" : "生成失敗");
      setTimeout(() => setGenUi(null), 2200);
    } finally {
      setBusyVideoId(null);
    }
  }

  async function saveSubtitleToVideo(videoId: string) {
    if (!subtitleDraft.trim()) {
      setErr("請先輸入手動字幕");
      return;
    }
    const res = await fetch(`/api/admin/videos/${videoId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subtitle_text: subtitleDraft.trim() }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(data?.detail ?? data?.error ?? "儲存失敗");
      return;
    }
    setErr(null);
    await load();
  }

  async function toggleActive(v: VideoLabRow, on: boolean) {
    const res = await fetch(`/api/admin/videos/${v.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        is_active: on,
        management_status: on ? "active" : v.management_status || "draft",
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(data?.detail ?? data?.error ?? "更新失敗");
      return;
    }
    setErr(null);
    await load();
  }

  async function approveSkillCand(cid: string, action: "approve" | "reject" | "approve_with_skill_code", code?: string) {
    const body =
      action === "approve_with_skill_code"
        ? { action: "approve_with_skill_code", skill_code: code }
        : { action };
    const res = await fetch(`/api/admin/video-skill-candidates/${cid}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(data?.error ?? "審核失敗");
      return;
    }
    if (focusedVideoId) await reloadFocus(focusedVideoId);
    await load();
  }

  async function patchQuestion(q: QuestionCand, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/generated-question-candidates/${q.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setErr(data?.message ?? data?.error ?? "更新失敗");
      return;
    }
    if (focusedVideoId) await reloadFocus(focusedVideoId);
    await load();
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function selectAllVisible() {
    setSelected(new Set(displayed.map((v) => v.id)));
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function selectUngenerated() {
    const next = new Set<string>();
    for (const v of videos) {
      if (v.skill_codes.length > 0 && v.draft_candidate_count === 0) next.add(v.id);
    }
    setSelected(next);
  }

  async function runBatchClient() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBatchOpen(true);
    setBatchRunning(true);
    setBatchSummary(null);
    const init: Record<string, BatchRowState> = {};
    for (const id of ids) {
      init[id] = { status: "waiting", pct: 0, label: "等待中…" };
    }
    setBatchRows(init);

    let completed = 0;
    let failed = 0;

    const runOne = async (videoId: string): Promise<"ok" | "fail"> => {
      const phases = ["字幕與技能…", "呼叫 AI…", "寫入候選…"];
      let phaseI = 0;
      const tick = setInterval(() => {
        phaseI = (phaseI + 1) % phases.length;
        setBatchRows((m) => ({
          ...m,
          [videoId]: {
            status: "running",
            pct: Math.min(88, (m[videoId]?.pct ?? 5) + 7),
            label: phases[phaseI]!,
          },
        }));
      }, 700);
      try {
        let lastErr = "生成失敗";
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          const res = await fetchWithTimeout(
            `/api/admin/videos/${videoId}/generate-questions`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ manual_subtitle: subtitleDraft.trim() || undefined, per_skill: 3 }),
            },
            GEN_TIMEOUT_MS,
          );
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            clearInterval(tick);
            const inserted = Number(data.inserted ?? 3) || 0;
            setVideos((vs) =>
              vs.map((v) =>
                v.id === videoId ? { ...v, draft_candidate_count: v.draft_candidate_count + inserted } : v,
              ),
            );
            setBatchRows((m) => ({
              ...m,
              [videoId]: { status: "done", pct: 100, label: "完成" },
            }));
            return "ok";
          }
          lastErr = data?.message ?? data?.error ?? lastErr;
          if (["NO_SKILLS_TAGGED", "NOT_FOUND", "NOT_EXAM3"].includes(String(data?.error))) break;
          await sleep(800);
        }
        clearInterval(tick);
        setBatchRows((m) => ({
          ...m,
          [videoId]: { status: "error", pct: 100, label: "失敗", error: lastErr },
        }));
        return "fail";
      } catch (e) {
        clearInterval(tick);
        const msg = e instanceof Error && e.name === "AbortError" ? "逾時" : "發生錯誤";
        setBatchRows((m) => ({
          ...m,
          [videoId]: { status: "error", pct: 100, label: "失敗", error: msg },
        }));
        return "fail";
      }
    };

    for (let i = 0; i < ids.length; i += 2) {
      const chunk = ids.slice(i, i + 2);
      const outs = await Promise.all(chunk.map((id) => runOne(id)));
      for (const o of outs) {
        if (o === "ok") completed += 1;
        else failed += 1;
      }
      if (i + 2 < ids.length) await sleep(BATCH_CHUNK_DELAY_MS);
    }

    setBatchRunning(false);
    setBatchSummary({ ok: completed, fail: failed });
    await load();
    if (focusedVideoId) await reloadFocus(focusedVideoId);
  }

  const selectedCount = selected.size;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-cyan-400/35/60 bg-gradient-to-br from-white via-teal-50/30 to-cyan-50/40 p-5 shadow-[0_0_40px_-12px_rgba(13,148,136,0.35)] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">AI 題庫管理中心</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            第三次段考影片理解題：分析字幕、比對技能樹、產出 draft 候選；核准後學生端才會看到測驗。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-400">
            已選 <strong className="text-slate-900">{selectedCount}</strong> 部
          </span>
          <button
            type="button"
            disabled={
              batchRunning || selectedCount === 0 || openAiConfigured === false || loading
            }
            onClick={() => void runBatchClient()}
            className="interactive-btn rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-40"
          >
            批次生成題目
          </button>
        </div>
      </div>

      {openAiConfigured === false ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          尚未設定 OPENAI_API_KEY，無法分析／生成。請於 Vercel（或主機）環境變數設定後重新部署。
        </p>
      ) : null}
      {err ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">{err}</p> : null}

      <section className="rounded-2xl border border-cyan-200/50 bg-white p-4 shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
          <button
            type="button"
            onClick={selectAllVisible}
            className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            全選（目前載入）
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="rounded-lg border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50/80"
          >
            取消全選
          </button>
          <button
            type="button"
            onClick={selectUngenerated}
            className="rounded-lg border border-cyan-400/35 bg-cyan-500/10/80 px-3 py-1.5 text-xs font-medium text-cyan-900 hover:bg-teal-100"
          >
            只選未生成
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="ml-auto rounded-lg border border-slate-200/90 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50/80"
          >
            重新整理資料
          </button>
        </div>

        <h2 className="mt-4 text-sm font-semibold text-slate-700">手動字幕（選填）</h2>
        <p className="text-xs text-slate-500">分析／生成時一併送出；或於卡片按「儲存字幕」寫入該片。</p>
        <textarea
          value={subtitleDraft}
          onChange={(e) => setSubtitleDraft(e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-200/80 bg-slate-50/70/50 px-3 py-2 text-sm font-mono"
          placeholder="VTT 或純文字…"
        />
      </section>

      <section className="space-y-4">
        {loading ? <p className="text-slate-400">載入影片…</p> : null}
        {!loading &&
          displayed.map((v) => (
            <article
              key={v.id}
              className="group flex min-h-[168px] flex-col gap-4 rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-sm transition-shadow duration-300 [content-visibility:auto] hover:shadow-[0_12px_40px_-16px_rgba(15,23,42,0.18)] sm:p-5 lg:flex-row lg:items-stretch lg:gap-6"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex flex-wrap items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(v.id)}
                    onChange={() => toggleSelect(v.id)}
                    className="mt-1 size-4 shrink-0 rounded border-slate-200/90"
                    aria-label={`選取 ${v.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold leading-snug text-slate-900">{v.title}</h3>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        狀態
                        <span className="rounded-full bg-slate-50 px-2 py-0.5 font-medium text-slate-600">
                          {v.status_label}
                        </span>
                      </span>
                      <span>{v.exam_scope_title} · {v.unit_title}</span>
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-400 break-all">YouTube：{v.youtube_video_id}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {v.skill_codes.length ? (
                        v.skill_codes.map((c) => (
                          <span
                            key={c}
                            className="inline-block max-w-full break-all rounded-md bg-cyan-500/10 px-2 py-0.5 text-xs font-mono text-cyan-900 ring-1 ring-cyan-400/30"
                          >
                            {c}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-amber-700">（尚無 skill tags）</span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      題庫題數（概估）：<strong>{v.question_count_via_skills}</strong>
                      <span className="mx-2 text-slate-600">|</span>
                      draft 候選：<strong>{v.draft_candidate_count}</strong>
                    </p>
                  </div>
                </div>

                {genUi && genUi.videoId === v.id ? (
                  <div className="mt-2 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3">
                    <p className="text-xs font-medium text-emerald-950">{genUi.label}</p>
                    <div className="mt-2">
                      <ProgressBar pct={genUi.pct} success={genUi.done} />
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[220px] lg:min-w-[200px] lg:max-w-[240px]">
                <button
                  type="button"
                  onClick={() => {
                    setFocusedVideoId(v.id);
                    setTimeout(() => {
                      document.getElementById("ai-lab-candidates")?.scrollIntoView({ behavior: "smooth" });
                    }, 0);
                  }}
                  className="interactive-btn w-full rounded-xl border border-slate-200/90 bg-white py-2 text-center text-xs font-medium text-slate-700 shadow-sm"
                >
                  檢視候選
                </button>
                <button
                  type="button"
                  disabled={loading || busyVideoId === v.id || openAiConfigured === false}
                  onClick={() => void analyze(v.id)}
                  className="interactive-btn w-full rounded-xl bg-indigo-600 py-2 text-center text-xs font-medium text-white shadow-sm disabled:opacity-50"
                >
                  分析影片
                </button>
                <Link
                  href="/admin/video-skill-tags"
                  className="interactive-btn flex w-full items-center justify-center rounded-xl border border-slate-200/90 bg-white py-2 text-center text-xs font-medium text-slate-700 shadow-sm"
                >
                  編輯 skill
                </Link>
                <button
                  type="button"
                  disabled={
                    loading ||
                    busyVideoId === v.id ||
                    v.skill_codes.length === 0 ||
                    openAiConfigured === false
                  }
                  onClick={() => void genQs(v.id)}
                  className="interactive-btn w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-2 text-center text-xs font-semibold text-white shadow-md disabled:opacity-50"
                >
                  生成題目
                </button>
                <button
                  type="button"
                  onClick={() => void saveSubtitleToVideo(v.id)}
                  className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  儲存字幕
                </button>
                <button
                  type="button"
                  onClick={() => void toggleActive(v, !v.is_active)}
                  className="w-full rounded-xl border border-slate-200/90 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50/80"
                >
                  {v.is_active ? "停用" : "啟用"}
                </button>
              </div>
            </article>
          ))}

        {!loading && visibleCount < videos.length ? (
          <button
            type="button"
            onClick={() => setVisibleCount((n) => Math.min(n + PAGE_SIZE, videos.length))}
            className="w-full rounded-xl border border-dashed border-slate-200/90 py-3 text-sm font-medium text-slate-400 hover:border-teal-400 hover:bg-cyan-500/10/40 hover:text-cyan-900"
          >
            載入更多（{visibleCount} / {videos.length}）
          </button>
        ) : null}
      </section>

      <section id="ai-lab-candidates" className="rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">候選審核面板</h2>
        <p className="mt-1 text-sm text-slate-400">
          Skill 候選亦可至{" "}
          <Link href="/admin/video-skill-review" className="text-cyan-700 underline">
            影片技能候選審核
          </Link>
          ；題目候選至{" "}
          <Link href="/admin/question-candidates" className="text-cyan-700 underline">
            題目候選審核
          </Link>
          。
        </p>
        {!focusedVideoId ? (
          <p className="mt-4 text-sm text-slate-500">請在上方卡片按「檢視候選」選定影片。</p>
        ) : (
          <div className="mt-4 space-y-6 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">
              對焦：<span className="font-mono text-xs">{focusedVideoId}</span>
            </p>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Skill 候選（pending）</h3>
              {skillCand.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">目前無 pending</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {skillCand.map((c) => (
                    <li key={c.id} className="rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-2 text-sm">
                      <span className="font-mono font-semibold">{c.suggested_skill_code}</span> {c.suggested_skill_name ?? ""}{" "}
                      <span className="text-xs text-slate-500">confidence {c.confidence ?? "-"}</span>
                      <p className="text-xs text-slate-400">{c.reason ?? ""}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void approveSkillCand(c.id, "approve")}
                          className="rounded bg-teal-700 px-2 py-1 text-xs text-white"
                        >
                          套用建議
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const code = prompt("改為 skill_code（大寫）", c.suggested_skill_code);
                            if (!code) return;
                            void approveSkillCand(c.id, "approve_with_skill_code", code.trim().toUpperCase());
                          }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          修改 code 套用
                        </button>
                        <button
                          type="button"
                          onClick={() => void approveSkillCand(c.id, "reject")}
                          className="rounded border px-2 py-1 text-xs text-rose-700"
                        >
                          拒絕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700">題目候選（draft）</h3>
              {qCand.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">目前無草稿題</p>
              ) : (
                <div className="mt-3 space-y-4">
                  {qCand.map((q) => (
                    <EditableQuestionCandidateCard
                      key={q.id}
                      q={q}
                      onPatch={(p) => patchQuestion(q, p)}
                      onReload={async () => {
                        if (!focusedVideoId) return;
                        await reloadFocus(focusedVideoId);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {batchOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-modal-title"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-5 shadow-2xl">
            <h2 id="batch-modal-title" className="text-lg font-semibold text-slate-900">
              批次生成中
            </h2>
            <ul className="mt-4 space-y-4">
              {[...selected].map((id) => {
                const row = batchRows[id];
                const title = videos.find((x) => x.id === id)?.title ?? id;
                return (
                  <li key={id} className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3">
                    <p className="text-sm font-medium text-slate-900 line-clamp-2">{title}</p>
                    {row ? (
                      <>
                        <p className="mt-1 text-xs text-slate-400">{row.label}</p>
                        <div className="mt-2">
                          <ProgressBar
                            pct={row.pct}
                            success={row.status === "done"}
                          />
                        </div>
                        {row.status === "error" && row.error ? (
                          <p className="mt-1 text-xs text-rose-700">{row.error}</p>
                        ) : null}
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {batchSummary ? (
              <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                已完成：{batchSummary.ok}　失敗：{batchSummary.fail}
              </p>
            ) : null}
            <button
              type="button"
              disabled={batchRunning}
              onClick={() => {
                setBatchOpen(false);
                setBatchRows({});
                setBatchSummary(null);
              }}
              className="interactive-btn mt-4 w-full rounded-xl border border-slate-200/90 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              {batchRunning ? "請稍候…" : "關閉"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
