import type { VideoInsert, VideoRepository } from "@/domain/repositories";
import { videoFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import type { VideoRow } from "@/types/database";

export class SupabaseVideoRepository implements VideoRepository {
  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? videoFromRow(data as VideoRow) : null;
  }

  async findByUnitId(unitId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .select("*")
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    return (data as VideoRow[]).map(videoFromRow);
  }

  async findAllActive() {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .select("*")
      .eq("is_active", true)
      .order("unit_id", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data as VideoRow[]).map(videoFromRow);
  }

  async findAllForAdmin() {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .select("*")
      .order("unit_id", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data as VideoRow[]).map(videoFromRow);
  }

  async insertMany(videos: VideoInsert[]) {
    if (videos.length === 0) return;
    const { error } = await getSupabaseAdmin().from("videos").insert(videos);
    if (error) throw error;
  }

  async insertReturningId(video: VideoInsert) {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .insert(video)
      .select("id")
      .single();
    if (error) throw error;
    return (data as { id: string }).id;
  }
}
