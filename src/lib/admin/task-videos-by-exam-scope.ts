import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { comparePlaylistVideoTitle } from "@/lib/video-title-sort";

export type AdminTaskVideoPickerRow = {
  videoId: string;
  title: string;
  sortOrder: number;
  displayIndex: number;
  isActive: boolean;
  hasQuiz: boolean;
  hasSkillTags: boolean;
};

export type AdminTaskVideoPickerUnit = {
  unitId: string;
  unitTitle: string;
  sortOrder: number;
  videos: AdminTaskVideoPickerRow[];
};

/**
 * 依段考 scope 載入單元與影片（僅該 scope 之 scope_units），供學習任務勾選。
 */
export async function loadTaskVideoPickerUnitsByExamScope(
  examScopeId: string,
): Promise<AdminTaskVideoPickerUnit[]> {
  const supabase = getSupabaseAdmin();
  const { data: units, error: uErr } = await supabase
    .from("scope_units")
    .select("id, unit_title, sort_order")
    .eq("exam_scope_id", examScopeId)
    .order("sort_order", { ascending: true });
  if (uErr) throw uErr;
  const unitRows = (units ?? []) as { id: string; unit_title: string; sort_order: number }[];
  if (unitRows.length === 0) return [];

  const unitIds = unitRows.map((u) => u.id);
  const { data: vrows, error: vErr } = await supabase
    .from("videos")
    .select("id, unit_id, title, sort_order, is_active")
    .in("unit_id", unitIds)
    .order("sort_order", { ascending: true });
  if (vErr) throw vErr;

  const videos = (vrows ?? []) as {
    id: string;
    unit_id: string;
    title: string;
    sort_order: number;
    is_active: boolean;
  }[];

  const videoIds = videos.map((v) => v.id);
  const hasQuiz = new Set<string>();
  const skillCount = new Map<string, number>();
  if (videoIds.length > 0) {
    const { data: qz } = await supabase.from("quizzes").select("video_id").in("video_id", videoIds);
    for (const q of qz ?? []) {
      hasQuiz.add((q as { video_id: string }).video_id);
    }
    const { data: tags } = await supabase.from("video_skill_tags").select("video_id").in("video_id", videoIds);
    for (const t of tags ?? []) {
      const id = (t as { video_id: string }).video_id;
      skillCount.set(id, (skillCount.get(id) ?? 0) + 1);
    }
  }

  let displayIndex = 0;
  const out: AdminTaskVideoPickerUnit[] = [];

  for (const u of unitRows) {
    const unitVideos = videos
      .filter((v) => v.unit_id === u.id)
      .sort((a, b) => comparePlaylistVideoTitle(a.title, b.title));
    const rows: AdminTaskVideoPickerRow[] = unitVideos.map((v) => {
      displayIndex += 1;
      return {
        videoId: v.id,
        title: v.title,
        sortOrder: v.sort_order,
        displayIndex,
        isActive: v.is_active,
        hasQuiz: hasQuiz.has(v.id),
        hasSkillTags: (skillCount.get(v.id) ?? 0) > 0,
      };
    });
    out.push({
      unitId: u.id,
      unitTitle: u.unit_title,
      sortOrder: u.sort_order,
      videos: rows,
    });
  }

  return out;
}
