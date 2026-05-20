"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EditableQuestionCandidateCard, type QuestionCand } from "@/components/admin/EditableQuestionCandidateCard";

type UnitOpt = {
  id: string;
  unit_title: string;
  unit_code: string;
  exam_scope_id: string;
  exam_scope_title: string;
};

type VideoListRow = {
  id: string;
  title: string;
  youtube_url: string;
  youtube_video_id: string;
  unit_id: string;
  unit_title: string;
  exam_scope_title: string;
  sort_order: number;
  is_active: boolean;
  management_status: string;
  status_label: string;
  skill_codes: string[];
  question_count_via_skills: number;
  draft_candidate_count?: number;
};

type SkillCand = {
  id: string;
  suggested_skill_code: string;
  suggested_skill_name: string | null;
  confidence: number | null;
  reason: string | null;
};

export function VideoManagementCenterClient() {
  const [units, setUnits] = useState<UnitOpt[]>([]);
  const [videos, setVideos] = useState<VideoListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAiConfigured, setOpenAiConfigured] = useState<boolean | null>(null);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [unitId, setUnitId] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const [subtitleDraft, setSubtitleDraft] = useState("");
  const [focusedVideoId, setFocusedVideoId] = useState<string | null>(null);
  const [skillCand, setSkillCand] = useState<SkillCand[]>([]);
  const [qCand, setQCand] = useState<QuestionCand[]>([]);
  const [busyVideoId, setBusyVideoId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const [res, envRes] = await Promise.all([
        fetch("/api/admin/videos", { credentials: "include" }),
        fetch("/api/admin/ai-env-status", { credentials: "include" }),
      ]);
      const envData = await envRes.json().catch(() => ({}));
      setOpenAiConfigured(envRes.ok ? Boolean(envData.openAiConfigured) : null);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.detail ?? data?.error ?? "LOAD_FAILED");
        return;
      }
      setVideos(data.videos ?? []);
      setUnits(data.units ?? []);
    } catch {
      setError("LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (units.length > 0 && !unitId) setUnitId(units[0]!.id);
  }, [units, unitId]);

  async function reloadFocus(videoId: string) {
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
  }

  useEffect(() => {
    if (focusedVideoId) void reloadFocus(focusedVideoId);
  }, [focusedVideoId]);

  async function submitNew() {
    const res = await fetch("/api/admin/videos", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        youtube_url: youtubeUrl.trim(),
        unit_id: unitId,
        sort_order: sortOrder,
        title: manualTitle.trim() || undefined,
        is_active: false,
        management_status: "draft",
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      alert(data?.message ?? data?.error ?? "新增失敗");
      return;
    }
    alert(data?.message ?? "已新增草稿影片");
    setYoutubeUrl("");
    setManualTitle("");
    await load();
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
        setNotice({ type: "error", text: data?.message ?? data?.error ?? "分析失敗" });
        return;
      }
      setNotice({ type: "success", text: data?.message ?? "分析完成（候選須再審核）" });
      setSubtitleDraft("");
      await load();
      if (focusedVideoId === videoId) await reloadFocus(videoId);
    } finally {
      setBusyVideoId(null);
    }
  }

  async function genQs(videoId: string) {
    setBusyVideoId(videoId);
    try {
      const res = await fetch(`/api/admin/videos/${videoId}/generate-questions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ manual_subtitle: subtitleDraft.trim() || undefined, per_skill: 3 }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice({ type: "error", text: data?.message ?? data?.error ?? "生成失敗" });
        return;
      }
      setNotice({ type: "success", text: data?.message ?? "已產出候選題" });
      await load();
      if (focusedVideoId === videoId) await reloadFocus(videoId);
    } finally {
      setBusyVideoId(null);
    }
  }

  async function toggleActive(v: VideoListRow, on: boolean) {
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
      alert(data?.detail ?? data?.error ?? "更新失敗");
      return;
    }
    await load();
  }

  async function saveSubtitleToVideo(videoId: string) {
    if (!subtitleDraft.trim()) {
      alert("請先輸入手動字幕");
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
      alert(data?.detail ?? data?.error ?? "儲存失敗");
      return;
    }
    alert("已儲存手動字幕到影片");
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
      alert(data?.error ?? "審核失敗");
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
      alert(data?.message ?? data?.error ?? "更新失敗");
      return;
    }
    if (focusedVideoId) await reloadFocus(focusedVideoId);
  }

  return (
    <div className="space-y-8">
      {openAiConfigured === false ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <p className="font-medium">尚未設定 OPENAI_API_KEY，無法使用「分析影片」與「生成題目」</p>
          <p className="mt-2 leading-relaxed">
            若為 Vercel 部署：請至專案{" "}
            <strong>Settings → Environment Variables</strong> 新增{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">OPENAI_API_KEY</code>
            ，並依需求勾選 Environment（Production / Preview），儲存後觸發<strong>重新部署</strong>。
          </p>
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className={
            notice.type === "error"
              ? "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
              : "rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-4 py-3 text-sm text-teal-950"
          }
        >
          {notice.text}
        </div>
      ) : null}
      <section className="rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">新增影片（草稿）</h2>
        <p className="mt-1 text-sm text-slate-400">
          將寫入 <code className="rounded bg-slate-50 px-1">videos</code> ，預設不啟用；核准 skill／題目並啟用後，學生端才看得到。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-slate-500">YouTube 連結</span>
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200/90 px-3 py-2 text-sm"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-slate-500">段考／單元</span>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200/90 px-3 py-2 text-sm"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.exam_scope_title} — {u.unit_title} ({u.unit_code})
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">手動標題（可留白，系統將嘗試抓取）</span>
            <input
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200/90 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">排序 sort_order</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-200/90 px-3 py-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={() => void submitNew()}
          className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          新增影片草稿
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">字幕備案（手動貼上）</h2>
        <p className="mt-1 text-sm text-slate-400">
          無法自動取得字幕時，貼於此並按「分析影片／生成題目」時一併送出，或對焦影片後「儲存字幕到影片」。
        </p>
        <textarea
          value={subtitleDraft}
          onChange={(e) => setSubtitleDraft(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-lg border border-slate-200/90 bg-white px-3 py-2 text-sm font-mono"
          placeholder="手動字幕文字…"
        />
      </section>

      <section className="rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">影片列表</h2>
        <p className="mt-1 text-sm text-slate-400">題目數為：該影片已連結之 skill_code 在題庫中的題數加總（概估）。</p>
        {loading ? <p className="mt-4 text-sm text-slate-500">載入中…</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        {!loading && !error ? (
          <ul className="mt-4 space-y-5">
            {videos.map((v) => (
              <li
                key={v.id}
                className="group flex min-h-[160px] flex-col gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-sm transition-shadow duration-300 hover:shadow-md lg:flex-row lg:items-stretch lg:gap-6"
              >
                <div className="min-w-0 flex-1 space-y-2">
                  <p className="font-medium leading-snug text-slate-900">{v.title}</p>
                  <p className="text-xs text-slate-500">
                    狀態：{v.status_label} · is_active={v.is_active ? "true" : "false"} · {v.management_status}
                  </p>
                  <p className="text-xs text-slate-500">
                    單元：{v.exam_scope_title} / {v.unit_title}
                  </p>
                  <p className="break-all text-xs font-mono text-slate-400">
                    Youtube: {v.youtube_video_id}{" "}
                    <a className="text-cyan-700 underline" href={v.youtube_url} target="_blank" rel="noopener noreferrer">
                      開啟連結
                    </a>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {v.skill_codes.length ? (
                      v.skill_codes.map((c) => (
                        <span
                          key={c}
                          className="inline-block max-w-full break-all rounded-md bg-white px-2 py-0.5 text-xs font-mono text-cyan-900 ring-1 ring-cyan-400/30"
                        >
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">skill：（無）</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    題目數（概估）：{v.question_count_via_skills}
                    {typeof v.draft_candidate_count === "number" ? (
                      <>
                        <span className="mx-2 text-slate-600">|</span>
                        draft：{v.draft_candidate_count}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 lg:w-[220px] lg:min-w-[200px] lg:max-w-[240px]">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedVideoId(v.id);
                        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                      }}
                      className="w-full rounded-lg border border-slate-200/90 bg-white py-2 text-center text-xs font-medium hover:bg-slate-50/80"
                    >
                      檢視候選
                    </button>
                    <button
                      type="button"
                      disabled={loading || busyVideoId === v.id || openAiConfigured === false}
                      onClick={() => void analyze(v.id)}
                      title={
                        openAiConfigured === false
                          ? "尚未設定 OPENAI_API_KEY"
                          : undefined
                      }
                      className="w-full rounded-lg bg-indigo-600 py-2 text-center text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      分析影片
                    </button>
                    <Link
                      href="/admin/video-skill-tags"
                      className="flex w-full items-center justify-center rounded-lg border border-slate-200/90 bg-white py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50/80"
                    >
                      編輯 skill 對應
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
                      title={
                        v.skill_codes.length === 0
                          ? "請先有正式 video_skill_tags"
                          : openAiConfigured === false
                            ? "尚未設定 OPENAI_API_KEY"
                            : undefined
                      }
                      className="w-full rounded-lg bg-teal-700 py-2 text-center text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      生成題目
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveSubtitleToVideo(v.id)}
                      className="w-full rounded-lg border border-slate-200/90 bg-white py-2 text-center text-xs font-medium hover:bg-slate-50/80"
                    >
                      儲存手動字幕
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(v, !v.is_active)}
                      className="w-full rounded-lg border border-slate-200/90 bg-white py-2 text-center text-xs font-medium hover:bg-slate-50/80"
                    >
                      {v.is_active ? "停用" : "啟用"}
                    </button>
                  </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)] p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">題目生成與審核入口</h2>
        <p className="mt-1 text-sm text-slate-400">
          Skill 候選沿用 <Link className="text-cyan-800 underline" href="/admin/video-skill-review">影片技能候選審核</Link>
          ，或在下方面板快速處理本支影片 pending。
        </p>

        {!focusedVideoId ? (
          <p className="mt-4 text-sm text-slate-500">請在上方列表按「檢視候選」選定影片。</p>
        ) : (
          <div className="mt-4 space-y-6 border-t border-slate-200 pt-4">
            <p className="text-sm text-slate-600">
              對焦影片 id：<span className="font-mono">{focusedVideoId}</span>
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
    </div>
  );
}
