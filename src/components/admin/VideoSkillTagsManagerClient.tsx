"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Unit = { id: string; unit_title: string; unit_code: string; sort_order: number };

type SkillRow = { code: string; name: string; unit: string | null };

type VideoTag = {
  id: string;
  skill_code: string;
  skill_name: string;
  created_at: string;
};

type VideoRow = {
  id: string;
  title: string;
  youtube_video_id: string | null;
  unit_id: string;
  sort_order: number;
  created_at?: string | null;
  scope_units?: { id: string; unit_title: string; unit_code: string; sort_order?: number | null } | null;
  video_skill_tags?: VideoTag[] | null;
};

function normCode(s: string): string {
  return s.trim().toUpperCase();
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

function unitCommonSkills(unit?: { unit_title: string; unit_code: string } | null): string[] {
  const code = (unit?.unit_code ?? "").toLowerCase();
  const title = unit?.unit_title ?? "";
  const key = `${code} ${title}`;
  if (key.includes("acid") || key.includes("base") || key.includes("酸") || key.includes("鹼") || key.includes("中和")) {
    return ["EL01", "AB01", "CO01", "NE01"];
  }
  if (key.includes("reaction") || key.includes("rate") || key.includes("反應速率")) {
    return ["RS01", "RS03", "RS06"];
  }
  return [];
}

function suggestByTitle(title: string): string[] {
  const t = title.toLowerCase();
  const out: string[] = [];
  const push = (code: string) => {
    if (!out.includes(code)) out.push(code);
  };
  if (t.includes("電解質")) {
    push("EL01");
    push("EL03");
  }
  if (t.includes("酸")) push("AB01");
  if (t.includes("鹼")) push("AB02");
  if (t.includes("濃度")) push("CO01");
  if (t.includes("中和")) push("NE01");
  if (t.includes("反應速率")) push("RS01");
  if (t.includes("溫度")) push("RS03");
  if (t.includes("濃度影響") || t.includes("濃度對")) push("RS04");
  if (t.includes("控制變因")) push("RS06");
  if (t.includes("圖") || t.includes("斜率")) push("RS10");
  return out;
}

function isSkillInUnit(params: {
  skill: SkillRow;
  unitTitle: string;
  unitCode: string;
}): boolean {
  const skillUnit = (params.skill.unit ?? "").trim().toLowerCase();
  const unitTitle = params.unitTitle.trim().toLowerCase();
  const unitCode = params.unitCode.trim().toLowerCase();

  if (!skillUnit && !unitTitle && !unitCode) return true;

  if (
    (unitTitle && skillUnit === unitTitle) ||
    (unitCode && skillUnit === unitCode) ||
    (unitTitle && skillUnit && unitTitle.includes(skillUnit)) ||
    (unitTitle && skillUnit && skillUnit.includes(unitTitle)) ||
    (unitCode && skillUnit && unitCode.includes(skillUnit)) ||
    (unitCode && skillUnit && skillUnit.includes(unitCode))
  ) {
    return true;
  }

  const code = params.skill.code.toUpperCase();
  const isRateUnit =
    unitTitle.includes("反應速率") ||
    unitTitle.includes("reaction rate") ||
    unitCode.includes("rate") ||
    skillUnit.includes("reaction_rate") ||
    skillUnit.includes("rate");
  if (isRateUnit) return code.startsWith("RS");

  const isAcidBaseUnit =
    unitTitle.includes("酸鹼") ||
    unitTitle.includes("中和") ||
    unitTitle.includes("acid") ||
    unitCode.includes("acid") ||
    unitCode.includes("base") ||
    skillUnit.includes("acid_base") ||
    skillUnit.includes("acid") ||
    skillUnit.includes("base");
  if (isAcidBaseUnit) {
    return (
      code.startsWith("EL") ||
      code.startsWith("AB") ||
      code.startsWith("CO") ||
      code.startsWith("NE")
    );
  }

  return false;
}

function SkillMultiSelect(props: {
  allSkills: SkillRow[];
  selected: Set<string>;
  onToggle: (code: string) => void;
  unitTitle?: string | null;
  unitCode?: string | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const el = boxRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const unitTitle = (props.unitTitle ?? "").trim();
    const unitCode = (props.unitCode ?? "").trim();
    const s = search.trim().toLowerCase();

    const base = props.allSkills.filter((x) => {
      if (showAll || (!unitTitle && !unitCode)) return true;
      if (isSkillInUnit({ skill: x, unitTitle, unitCode })) return true;
      // 已選取的跨單元技能仍需顯示，避免看不到目前勾選
      return props.selected.has(x.code);
    });

    if (!s) return base;
    return base.filter((x) => `${x.code} ${x.name}`.toLowerCase().includes(s));
  }, [props.allSkills, props.selected, props.unitTitle, props.unitCode, search, showAll]);

  const label = useMemo(() => {
    if (props.selected.size === 0) return "選擇技能（可多選）";
    const arr = Array.from(props.selected).sort();
    return `已選 ${arr.length} 個：${arr.slice(0, 3).join("、")}${arr.length > 3 ? "…" : ""}`;
  }, [props.selected]);

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        disabled={props.disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-10 w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="truncate">{label}</span>
        <span className="text-xs text-slate-500">{open ? "收合" : "展開"}</span>
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-[360px] max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="搜尋 skill_code 或名稱"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">
                {showAll ? "顯示全部技能" : "只顯示本單元技能"}
              </span>
              <button
                type="button"
                onClick={() => setShowAll((v) => !v)}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                {showAll ? "只顯示本單元" : "顯示全部"}
              </button>
            </div>
          </div>
          <div className="max-h-72 overflow-auto p-2">
            {filtered.length === 0 ? (
              <div className="p-3">
                <p className="text-sm text-slate-600">沒有符合的技能。</p>
                {!showAll ? (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    切換為顯示全部
                  </button>
                ) : null}
              </div>
            ) : (
              filtered.map((s) => {
                const checked = props.selected.has(s.code);
                return (
                  <label
                    key={s.code}
                    className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => props.onToggle(s.code)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-slate-900">
                        <span className="font-mono font-semibold">{s.code}</span>{" "}
                        <span className="text-slate-700">{s.name}</span>
                      </div>
                      {s.unit ? <div className="text-xs text-slate-500">單元：{s.unit}</div> : null}
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-3">
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setSearch("");
                setOpen(false);
              }}
            >
              完成
            </button>
            <span className="text-xs text-slate-500">勾選/取消勾選後會標記為尚未儲存</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function VideoSkillTagsManagerClient() {
  const [q, setQ] = useState("");
  const [unitId, setUnitId] = useState("");
  const [skillQ, setSkillQ] = useState("");
  const [onlyUnset, setOnlyUnset] = useState(false);
  const [onlyDirty, setOnlyDirty] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const [units, setUnits] = useState<Unit[]>([]);
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [collapsedByUnitId, setCollapsedByUnitId] = useState<Record<string, boolean>>({});

  const [currentByVideo, setCurrentByVideo] = useState<Record<string, string[]>>({});
  const originalByVideoRef = useRef<Record<string, string[]>>({});

  const skillNameByCode = useMemo(() => new Map(skills.map((s) => [s.code, s.name])), [skills]);

  async function load() {
    setLoading(true);
    setError(null);
    setBanner(null);
    try {
      const res = await fetch(`/api/admin/video-skill-tags`, { credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ? `${data.error}${data.detail ? `（${data.detail}）` : ""}` : "LOAD_FAILED");
        setLoading(false);
        return;
      }
      const vs = (data?.videos ?? []) as VideoRow[];
      const unitRows = ((data?.units ?? []) as Unit[]).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setUnits(unitRows);
      setSkills((data?.skills ?? []) as SkillRow[]);
      setVideos(vs);

      const original: Record<string, string[]> = {};
      const current: Record<string, string[]> = {};
      vs.forEach((v) => {
        const codes = Array.from(new Set((v.video_skill_tags ?? []).map((t) => normCode(t.skill_code)))).sort();
        original[v.id] = codes;
        current[v.id] = codes;
      });
      originalByVideoRef.current = original;
      setCurrentByVideo(current);

      setCollapsedByUnitId((prev) => {
        const next: Record<string, boolean> = { ...prev };
        unitRows.forEach((u) => {
          if (next[u.id] === undefined) next[u.id] = false;
        });
        return next;
      });
    } catch {
      setError("LOAD_FAILED");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const dirtyVideoIds = useMemo(() => {
    const out: string[] = [];
    for (const v of videos) {
      const cur = new Set((currentByVideo[v.id] ?? []).map(normCode));
      const ori = new Set((originalByVideoRef.current[v.id] ?? []).map(normCode));
      if (!sameSet(cur, ori)) out.push(v.id);
    }
    return out;
  }, [videos, currentByVideo]);

  const stats = useMemo(() => {
    const total = videos.length;
    let setCount = 0;
    let unsetCount = 0;
    let multiCount = 0;
    videos.forEach((v) => {
      const codes = currentByVideo[v.id] ?? [];
      if (codes.length === 0) unsetCount += 1;
      else setCount += 1;
      if (codes.length >= 2) multiCount += 1;
    });
    return { total, setCount, unsetCount, multiCount, dirty: dirtyVideoIds.length };
  }, [videos, currentByVideo, dirtyVideoIds.length]);

  const filteredVideos = useMemo(() => {
    const titleQ = q.trim().toLowerCase();
    const skillSearch = normCode(skillQ);

    return videos.filter((v) => {
      if (unitId && v.unit_id !== unitId) return false;

      const codes = currentByVideo[v.id] ?? [];
      if (onlyUnset && codes.length > 0) return false;
      if (onlyDirty && !dirtyVideoIds.includes(v.id)) return false;

      if (titleQ && !v.title.toLowerCase().includes(titleQ)) return false;

      if (skillSearch) {
        const hitCode = codes.some((c) => normCode(c).includes(skillSearch));
        const hitName = codes.some((c) => (skillNameByCode.get(normCode(c)) ?? "").includes(skillQ.trim()));
        if (!hitCode && !hitName) return false;
      }

      return true;
    });
  }, [videos, q, unitId, skillQ, onlyUnset, onlyDirty, currentByVideo, dirtyVideoIds, skillNameByCode]);

  const grouped = useMemo(() => {
    const byUnit = new Map<string, VideoRow[]>();
    filteredVideos.forEach((v) => {
      const cur = byUnit.get(v.unit_id) ?? [];
      cur.push(v);
      byUnit.set(v.unit_id, cur);
    });

    const sortVideos = (list: VideoRow[]) =>
      list
        .slice()
        .sort((a, b) => {
          const ao = a.sort_order ?? 0;
          const bo = b.sort_order ?? 0;
          if (ao !== bo) return ao - bo;
          const ac = a.created_at ?? "";
          const bc = b.created_at ?? "";
          return ac.localeCompare(bc);
        });

    const knownUnitIds = new Set(units.map((u) => u.id));
    const orderedUnits: Array<{ unit: Unit | null; unit_id: string; videos: VideoRow[] }> = [];

    units.forEach((u) => {
      const list = byUnit.get(u.id) ?? [];
      if (list.length === 0) return;
      orderedUnits.push({ unit: u, unit_id: u.id, videos: sortVideos(list) });
    });

    // 若資料裡有 unit_id 但不在 scope_units（理論上不該發生），集中放到最後
    Array.from(byUnit.entries()).forEach(([uid, list]) => {
      if (knownUnitIds.has(uid)) return;
      orderedUnits.push({ unit: null, unit_id: uid, videos: sortVideos(list) });
    });

    return orderedUnits;
  }, [filteredVideos, units]);

  function setVideoCodes(videoId: string, codes: string[]) {
    const normalized = Array.from(new Set(codes.map(normCode).filter(Boolean))).sort();
    setCurrentByVideo((prev) => ({ ...prev, [videoId]: normalized }));
  }

  function toggleVideoCode(videoId: string, code: string) {
    const c = normCode(code);
    const cur = new Set((currentByVideo[videoId] ?? []).map(normCode));
    if (cur.has(c)) cur.delete(c);
    else cur.add(c);
    setVideoCodes(videoId, Array.from(cur));
  }

  async function saveAll() {
    const updates = dirtyVideoIds.map((videoId) => ({
      video_id: videoId,
      skill_codes: currentByVideo[videoId] ?? [],
    }));
    if (updates.length === 0) return;

    setSaving(true);
    setBanner(null);
    try {
      const res = await fetch("/api/admin/video-skill-tags/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ updates }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        alert(`儲存失敗：${data?.error ?? res.status}`);
        setSaving(false);
        return;
      }
      setBanner(`已儲存 ${data?.updated_videos ?? updates.length} 支影片的技能對應（新增 ${data?.added ?? 0}、移除 ${data?.removed ?? 0}）`);
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-24">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">篩選與檢查</h2>
            <p className="mt-1 text-xs text-slate-500">修改後會標記為「尚未儲存」，按下方「儲存所有修改」才會寫入。</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">全部 {stats.total}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs text-emerald-700">已設定 {stats.setCount}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">未設定 {stats.unsetCount}</span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-700">多技能 {stats.multiCount}</span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-xs text-rose-700">未儲存 {stats.dirty}</span>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs text-slate-500">影片標題</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="輸入關鍵字"
            />
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">單元</span>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">全部單元</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.unit_title}（{u.unit_code}）
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-500">搜尋 skill_code / skill_name</span>
            <input
              value={skillQ}
              onChange={(e) => setSkillQ(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="例如 AB01 或 酸的基本性質"
            />
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={onlyUnset} onChange={(e) => setOnlyUnset(e.target.checked)} />
            只看未設定 skill
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={onlyDirty} onChange={(e) => setOnlyDirty(e.target.checked)} />
            只看已修改未儲存
          </label>
        </div>
      </section>

      {banner ? (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {banner}
        </section>
      ) : null}

      {loading ? <p className="text-sm text-slate-600">載入中…</p> : null}
      {error ? <p className="text-sm text-rose-700">載入失敗：{error}</p> : null}

      {!loading && !error ? (
        <div className="space-y-3">
          {grouped.map((g) => {
            const unit = g.unit;
            const title = unit ? `${unit.unit_title}（共 ${g.videos.length} 部影片）` : `未分類（共 ${g.videos.length} 部影片）`;
            const collapsed = collapsedByUnitId[g.unit_id] ?? false;
            return (
              <section key={g.unit_id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setCollapsedByUnitId((prev) => ({ ...prev, [g.unit_id]: !collapsed }))}
                  title={collapsed ? "點擊展開此單元" : "點擊折疊此單元"}
                  className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left hover:bg-slate-50 sm:px-5"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      依單元分組；組內依影片順序（sort_order）排序
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-600">{collapsed ? "＋ 展開" : "− 折疊"}</span>
                </button>

                {!collapsed ? (
                  <div className="space-y-3 border-t border-slate-100 p-4 sm:p-5">
                    {g.videos.map((v, i) => {
                      const unitInfo = v.scope_units;
                      const selected = new Set((currentByVideo[v.id] ?? []).map(normCode));
                      const isDirty = dirtyVideoIds.includes(v.id);
                      const prev = i > 0 ? g.videos[i - 1] : null;
                      const common = unitCommonSkills(unitInfo ?? null);
                      const suggested = suggestByTitle(v.title);
                      return (
                        <section
                          key={v.id}
                          className={`rounded-2xl border bg-white p-4 shadow-sm sm:p-5 ${
                            isDirty ? "border-rose-200 ring-1 ring-rose-100" : "border-slate-200"
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="min-w-0 truncate font-medium text-slate-900">
                                  <span className="mr-2 text-xs text-slate-500">#{v.sort_order}</span>
                                  {v.title}
                                </h3>
                                {isDirty ? (
                                  <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                                    尚未儲存
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                YouTube ID：<span className="font-mono">{v.youtube_video_id ?? "-"}</span>
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                單元：{unitInfo ? `${unitInfo.unit_title}（${unitInfo.unit_code}）` : v.unit_id}
                              </p>
                            </div>

                            <div className="w-full max-w-[420px] space-y-2">
                              <SkillMultiSelect
                                allSkills={skills}
                                selected={selected}
                                onToggle={(code) => toggleVideoCode(v.id, code)}
                                unitTitle={unitInfo?.unit_title ?? null}
                                unitCode={unitInfo?.unit_code ?? null}
                                disabled={saving}
                              />
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={saving || !prev}
                                  onClick={() => {
                                    if (!prev) return;
                                    setVideoCodes(v.id, currentByVideo[prev.id] ?? []);
                                  }}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  複製上一支影片設定
                                </button>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => setVideoCodes(v.id, [])}
                                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                >
                                  清空本影片設定
                                </button>
                                {common.length > 0 ? (
                                  <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setVideoCodes(v.id, common)}
                                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                                  >
                                    套用常用 skill
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {Array.from(selected).length === 0 ? (
                              <span className="text-sm text-slate-500">尚未連結 skill</span>
                            ) : (
                              Array.from(selected)
                                .sort()
                                .map((code) => (
                                  <span
                                    key={code}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-800"
                                  >
                                    <span className="font-mono font-semibold">{code}</span>
                                    <span className="text-slate-600">{skillNameByCode.get(code) ?? code}</span>
                                    <button
                                      type="button"
                                      disabled={saving}
                                      onClick={() => toggleVideoCode(v.id, code)}
                                      className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                                    >
                                      取消
                                    </button>
                                  </span>
                                ))
                            )}
                          </div>

                          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-medium text-slate-800">建議 skill（不會自動套用）</div>
                              <button
                                type="button"
                                disabled={saving}
                                onClick={() => {
                                  const list = suggested;
                                  if (list.length === 0) {
                                    alert("找不到明顯的規則建議（可自行勾選）。");
                                    return;
                                  }
                                  const msg = list
                                    .map((c) => `${c} ${(skillNameByCode.get(c) ?? c).trim()}`)
                                    .join("\n");
                                  alert(`系統建議：\n${msg}`);
                                }}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                建議 skill
                              </button>
                            </div>
                            {suggested.length > 0 ? (
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-slate-600">
                                  系統建議：
                                  {suggested.map((c) => ` ${c} ${skillNameByCode.get(c) ?? c}`).join("、")}
                                </span>
                                <button
                                  type="button"
                                  disabled={saving}
                                  onClick={() => setVideoCodes(v.id, suggested)}
                                  className="rounded-lg bg-teal-700 px-3 py-2 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                                >
                                  套用建議
                                </button>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs text-slate-500">（沒有匹配到規則建議）</div>
                            )}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                ) : null}
              </section>
            );
          })}
          {grouped.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">沒有符合條件的影片。</p>
          ) : null}
        </div>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <div className="text-sm text-slate-700">
            未儲存：<span className="font-semibold text-rose-700">{dirtyVideoIds.length}</span> 支
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={saving || dirtyVideoIds.length === 0}
              onClick={() => void saveAll()}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "儲存中…" : "儲存所有修改"}
            </button>
            <button
              type="button"
              disabled={saving || dirtyVideoIds.length === 0}
              onClick={() => {
                if (!confirm("要放棄所有尚未儲存的修改嗎？")) return;
                const original = originalByVideoRef.current;
                setCurrentByVideo({ ...original });
                setBanner(null);
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              放棄修改
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

