import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

/** 由影片 id 解析所屬段考 exam_scope_id（經 scope_units） */
export async function resolveExamScopeIdFromVideoId(videoId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: v } = await supabase.from("videos").select("unit_id").eq("id", videoId).maybeSingle();
  const unitId = v?.unit_id as string | undefined;
  if (!unitId) return null;
  const { data: su } = await supabase
    .from("scope_units")
    .select("exam_scope_id")
    .eq("id", unitId)
    .maybeSingle();
  return (su?.exam_scope_id as string | null) ?? null;
}
