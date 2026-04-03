import type { SkillTagRepository, SkillTagUpsert } from "@/domain/repositories";
import { skillTagFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { SkillTagRow } from "@/types/database";

export class SupabaseSkillTagRepository implements SkillTagRepository {
  async findAll() {
    const { data, error } = await getSupabaseAdmin()
      .from("skill_tags")
      .select("*")
      .order("code");
    throwIfPostgrestError(error);
    return (data as SkillTagRow[]).map(skillTagFromRow);
  }

  async findByCode(code: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("skill_tags")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? skillTagFromRow(data as SkillTagRow) : null;
  }

  async upsertMany(tags: SkillTagUpsert[]) {
    if (tags.length === 0) return;
    const { error } = await getSupabaseAdmin()
      .from("skill_tags")
      .upsert(tags, { onConflict: "code" });
    throwIfPostgrestError(error);
  }
}
