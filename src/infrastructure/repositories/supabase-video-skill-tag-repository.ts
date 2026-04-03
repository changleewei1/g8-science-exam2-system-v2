import type {
  VideoSkillTagInsert,
  VideoSkillTagRepository,
} from "@/domain/repositories";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export class SupabaseVideoSkillTagRepository implements VideoSkillTagRepository {
  async insertMany(tags: VideoSkillTagInsert[]) {
    if (tags.length === 0) return;
    const { error } = await getSupabaseAdmin().from("video_skill_tags").insert(tags);
    if (error) throw error;
  }

  async findSkillCodesByVideoId(videoId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("video_skill_tags")
      .select("skill_code")
      .eq("video_id", videoId);
    if (error) throw error;
    return (data ?? []).map((r: { skill_code: string }) => r.skill_code);
  }
}
