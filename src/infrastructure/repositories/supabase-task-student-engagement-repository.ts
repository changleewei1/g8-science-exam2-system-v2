import type { TaskStudentEngagementRepository } from "@/domain/repositories/task-student-engagement-repository";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { TaskStudentProgressRow } from "@/types/database";

export class SupabaseTaskStudentEngagementRepository implements TaskStudentEngagementRepository {
  async markTaskOpened(studentId: string, taskId: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: existing, error: selErr } = await supabase
      .from("task_student_progress")
      .select("id, first_seen_at, opened_at")
      .eq("task_id", taskId)
      .eq("student_id", studentId)
      .maybeSingle();
    throwIfPostgrestError(selErr);

    const row = existing as { id: string; first_seen_at: string | null; opened_at: string | null } | null;
    const firstSeen = row?.first_seen_at ?? now;

    if (row) {
      const { error } = await supabase
        .from("task_student_progress")
        .update({
          opened_at: now,
          first_seen_at: firstSeen,
          updated_at: now,
        })
        .eq("id", row.id);
      throwIfPostgrestError(error);
      return;
    }

    const { error } = await supabase.from("task_student_progress").insert({
      task_id: taskId,
      student_id: studentId,
      video_completed_count: 0,
      total_videos: 0,
      quiz_completed_count: 0,
      total_quizzes: 0,
      opened_at: now,
      first_seen_at: firstSeen,
      updated_at: now,
    });
    throwIfPostgrestError(error);
  }

  async listByStudent(studentId: string): Promise<TaskStudentProgressRow[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("task_student_progress")
      .select("*")
      .eq("student_id", studentId);
    throwIfPostgrestError(error);
    return (data as TaskStudentProgressRow[]) ?? [];
  }
}
