import type {
  VideoSkillTagInsert,
  VideoSkillTagRepository,
} from "@/domain/repositories";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";

export class SupabaseVideoSkillTagRepository implements VideoSkillTagRepository {
  async insertMany(tags: VideoSkillTagInsert[]) {
    if (tags.length === 0) return;
    const { error } = await getSupabaseAdmin().from("video_skill_tags").insert(tags);
    throwIfPostgrestError(error);
  }

  async findSkillCodesByVideoId(videoId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("video_skill_tags")
      .select("skill_code")
      .eq("video_id", videoId);
    throwIfPostgrestError(error);
    return (data ?? []).map((r: { skill_code: string }) => r.skill_code);
  }
}
