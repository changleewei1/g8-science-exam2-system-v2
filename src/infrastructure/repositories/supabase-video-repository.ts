import type { VideoInsert, VideoRepository } from "@/domain/repositories";
import { videoFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import {
  sortVideosByUnitThenPlaylistTitle,
  sortVideosInUnitByPlaylistTitle,
} from "@/lib/video-title-sort";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { VideoRow } from "@/types/database";

export class SupabaseVideoRepository implements VideoRepository {
  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? videoFromRow(data as VideoRow) : null;
  }

  async findByUnitId(unitId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .select("*")
      .eq("unit_id", unitId)
      .eq("is_active", true);
    throwIfPostgrestError(error);
    const list = (data as VideoRow[]).map(videoFromRow);
    return sortVideosInUnitByPlaylistTitle(list);
  }

  async findAllActive() {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .select("*")
      .eq("is_active", true);
    throwIfPostgrestError(error);
    const list = (data as VideoRow[]).map(videoFromRow);
    return sortVideosByUnitThenPlaylistTitle(list);
  }

  async findAllForAdmin() {
    const { data, error } = await getSupabaseAdmin().from("videos").select("*");
    throwIfPostgrestError(error);
    const list = (data as VideoRow[]).map(videoFromRow);
    return sortVideosByUnitThenPlaylistTitle(list);
  }

  async insertMany(videos: VideoInsert[]) {
    if (videos.length === 0) return;
    const { error } = await getSupabaseAdmin().from("videos").insert(videos);
    throwIfPostgrestError(error);
  }

  async insertReturningId(video: VideoInsert) {
    const { data, error } = await getSupabaseAdmin()
      .from("videos")
      .insert(video)
      .select("id")
      .single();
    throwIfPostgrestError(error);
    return (data as { id: string }).id;
  }
}
