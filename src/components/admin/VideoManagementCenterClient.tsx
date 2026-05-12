"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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
};

type SkillCand = {
  id: string;
  suggested_skill_code: string;
  suggested_skill_name: string | null;
  confidence: number | null;
  reason: string | null;
};

type QuestionCand = {
  id: string;
  skill_code: string;
  difficulty: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  status: string;
};

export function VideoManagementCenterClient() {
  const [units, setUnits] = useState<UnitOpt[]>([]);
  const [videos, setVideos] = useState<VideoListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const res = await fetch("/api/admin/videos", { credentials: "include" });
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
        alert(data?.message ?? data?.error ?? "分析失敗");
        return;
      }
      alert(data?.message ?? "分析完成（候選須再審核）");
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
        alert(data?.message ?? data?.error ?? "生成失敗");
        return;
      }
      alert(data?.message ?? "已產出候選題");
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
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">新增影片（草稿）</h2>
        <p className="mt-1 text-sm text-slate-600">
          將寫入 <code className="rounded bg-slate-100 px-1">videos</code> ，預設不啟用；核准 skill／題目並啟用後，學生端才看得到。
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-xs text-slate-500">YouTube 連結</span>
            <input
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-slate-500">段考／單元</span>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">排序 sort_order</span>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
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

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-900">字幕備案（手動貼上）</h2>
        <p className="mt-1 text-sm text-slate-600">
          無法自動取得字幕時，貼於此並按「分析影片／生成題目」時一併送出，或對焦影片後「儲存字幕到影片」。
        </p>
        <textarea
          value={subtitleDraft}
          onChange={(e) => setSubtitleDraft(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
          placeholder="手動字幕文字…"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">影片列表</h2>
        <p className="mt-1 text-sm text-slate-600">題目數為：該影片已連結之 skill_code 在題庫中的題數加總（概估）。</p>
        {loading ? <p className="mt-4 text-sm text-slate-500">載入中…</p> : null}
        {error ? <p className="mt-4 text-sm text-rose-700">{error}</p> : null}
        {!loading && !error ? (
          <ul className="mt-4 space-y-4">
            {videos.map((v) => (
              <li key={v.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{v.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      狀態：{v.status_label} · is_active={v.is_active ? "true" : "false"} · {v.management_status}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      單元：{v.exam_scope_title} / {v.unit_title}
                    </p>
                    <p className="mt-1 text-xs font-mono text-slate-600">
                      Youtube: {v.youtube_video_id}{" "}
                      <a className="text-teal-700 underline" href={v.youtube_url} target="_blank" rel="noopener noreferrer">
                        開啟連結
                      </a>
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      skill：<span className="font-mono">{v.skill_codes.length ? v.skill_codes.join(", ") : "(無)"}</span>
                    </p>
                    <p className="text-xs text-slate-600">題目數（概估）：{v.question_count_via_skills}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFocusedVideoId(v.id);
                        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium"
                    >
                      檢視候選
                    </button>
                    <button
                      type="button"
                      disabled={busyVideoId === v.id}
                      onClick={() => void analyze(v.id)}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      分析影片
                    </button>
                    <Link
                      href="/admin/video-skill-tags"
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
                    >
                      編輯 skill 對應
                    </Link>
                    <button
                      type="button"
                      disabled={busyVideoId === v.id || v.skill_codes.length === 0}
                      onClick={() => void genQs(v.id)}
                      title={v.skill_codes.length === 0 ? "請先有正式 video_skill_tags" : undefined}
                      className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                    >
                      生成題目
                    </button>
                    <button
                      type="button"
                      onClick={() => void saveSubtitleToVideo(v.id)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium"
                    >
                      儲存手動字幕
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(v, !v.is_active)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium"
                    >
                      {v.is_active ? "停用" : "啟用"}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">題目生成與審核入口</h2>
        <p className="mt-1 text-sm text-slate-600">
          Skill 候選沿用 <Link className="text-teal-800 underline" href="/admin/video-skill-review">影片技能候選審核</Link>
          ，或在下方面板快速處理本支影片 pending。
        </p>

        {!focusedVideoId ? (
          <p className="mt-4 text-sm text-slate-500">請在上方列表按「檢視候選」選定影片。</p>
        ) : (
          <div className="mt-4 space-y-6 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-700">
              對焦影片 id：<span className="font-mono">{focusedVideoId}</span>
            </p>

            <div>
              <h3 className="text-sm font-semibold text-slate-800">Skill 候選（pending）</h3>
              {skillCand.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">目前無 pending</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {skillCand.map((c) => (
                    <li key={c.id} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-mono font-semibold">{c.suggested_skill_code}</span> {c.suggested_skill_name ?? ""}{" "}
                      <span className="text-xs text-slate-500">confidence {c.confidence ?? "-"}</span>
                      <p className="text-xs text-slate-600">{c.reason ?? ""}</p>
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
              <h3 className="text-sm font-semibold text-slate-800">題目候選（draft）</h3>
              {qCand.length === 0 ? (
                <p className="mt-2 text-xs text-slate-500">目前無草稿題</p>
              ) : (
                <div className="mt-3 space-y-4">
                  {qCand.map((q) => (
                    <EditableQuestionCard
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

function EditableQuestionCard(props: {
  q: QuestionCand;
  onPatch: (p: Record<string, unknown>) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const { q } = props;
  const [text, setText] = useState(q.question_text);
  const [a, setA] = useState(q.choice_a);
  const [b, setB] = useState(q.choice_b);
  const [c, setC] = useState(q.choice_c);
  const [d, setD] = useState(q.choice_d);
  const [ans, setAns] = useState(q.correct_answer);
  const [exp, setExp] = useState(q.explanation ?? "");
  async function approve() {
    await props.onPatch({ action: "approve" });
    await props.onReload();
  }
  async function reject() {
    await props.onPatch({ action: "reject" });
    await props.onReload();
  }
  async function save() {
    await props.onPatch({
      question_text: text,
      choice_a: a,
      choice_b: b,
      choice_c: c,
      choice_d: d,
      correct_answer: ans.toUpperCase() as "A" | "B" | "C" | "D",
      explanation: exp,
      action: "update",
    });
    await props.onReload();
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-xs font-mono text-slate-600">
        {q.skill_code} · {q.difficulty}
      </p>
      <textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-2 w-full rounded border px-2 py-1 text-sm" rows={2} />
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input value={a} onChange={(e) => setA(e.target.value)} className="rounded border px-2 py-1 text-xs" placeholder="A" />
        <input value={b} onChange={(e) => setB(e.target.value)} className="rounded border px-2 py-1 text-xs" placeholder="B" />
        <input value={c} onChange={(e) => setC(e.target.value)} className="rounded border px-2 py-1 text-xs" placeholder="C" />
        <input value={d} onChange={(e) => setD(e.target.value)} className="rounded border px-2 py-1 text-xs" placeholder="D" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <select value={ans} onChange={(e) => setAns(e.target.value)} className="rounded border px-2 py-1 text-sm">
          {(["A", "B", "C", "D"] as const).map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <textarea value={exp} onChange={(e) => setExp(e.target.value)} className="mt-2 w-full rounded border px-2 py-1 text-sm" rows={2} placeholder="詳解" />
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" onClick={() => void save()} className="rounded-lg border bg-white px-3 py-1 text-xs font-medium">
          儲存修改
        </button>
        <button type="button" onClick={() => void approve()} className="rounded-lg bg-teal-700 px-3 py-1 text-xs font-medium text-white">
          核准入題庫
        </button>
        <button type="button" onClick={() => void reject()} className="rounded-lg border px-3 py-1 text-xs text-rose-700">
          拒絕
        </button>
      </div>
    </div>
  );
}
