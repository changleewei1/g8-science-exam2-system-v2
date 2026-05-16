import type {
  VideoProgressRepository,
  VideoProgressUpsert,
} from "@/domain/repositories";
import { VideoProgress } from "@/domain/entities";
import { videoProgressFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { StudentVideoProgressRow } from "@/types/database";

export class SupabaseVideoProgressRepository implements VideoProgressRepository {
  async findByStudentAndVideo(studentId: string, videoId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_video_progress")
      .select("*")
      .eq("student_id", studentId)
      .eq("video_id", videoId)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? videoProgressFromRow(data as StudentVideoProgressRow) : null;
  }

  async upsert(row: VideoProgressUpsert) {
    const payload: Record<string, unknown> = {
      ...row,
      watch_seconds: row.watch_seconds,
      last_position_seconds: row.last_position_seconds,
      completion_rate: row.completion_rate,
    };
    if (!row.id) delete payload.id;
    const { data, error } = await getSupabaseAdmin()
      .from("student_video_progress")
      .upsert(payload, { onConflict: "student_id,video_id" })
      .select("*")
      .single();
    throwIfPostgrestError(error);
    return videoProgressFromRow(data as StudentVideoProgressRow);
  }

  async findByStudentId(studentId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_video_progress")
      .select("*")
      .eq("student_id", studentId);
    throwIfPostgrestError(error);
    return (data as StudentVideoProgressRow[]).map(videoProgressFromRow);
  }

  async countCompletedByStudent(studentId: string) {
    const { count, error } = await getSupabaseAdmin()
      .from("student_video_progress")
      .select("*", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("is_completed", true);
    throwIfPostgrestError(error);
    return count ?? 0;
  }

  async markCompletedFromQuizPass(studentId: string, videoId: string) {
    const existing = await this.findByStudentAndVideo(studentId, videoId);
    const e = existing
      ? new VideoProgress(
          existing.id,
          existing.studentId,
          existing.videoId,
          existing.watchSeconds,
          existing.lastPositionSeconds,
          existing.completionRate,
          existing.isCompleted,
          existing.firstViewedAt,
          existing.lastViewedAt,
          existing.completedAt,
          existing.viewCount,
        )
      : new VideoProgress("", studentId, videoId, 0, 0, 0, false, null, null, null, 0);
    e.markCompleted();
    await this.upsert({
      student_id: studentId,
      video_id: videoId,
      watch_seconds: e.watchSeconds,
      last_position_seconds: e.lastPositionSeconds,
      completion_rate: e.completionRate,
      is_completed: true,
      first_viewed_at: e.firstViewedAt?.toISOString() ?? null,
      last_viewed_at: e.lastViewedAt?.toISOString() ?? null,
      completed_at: e.completedAt?.toISOString() ?? null,
      view_count: e.viewCount,
    });
  }
}
