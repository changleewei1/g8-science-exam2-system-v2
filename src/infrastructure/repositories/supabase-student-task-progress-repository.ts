import type {
  StudentTaskProgressRepository,
  StudentTaskProgressUpsert,
} from "@/domain/repositories/student-task-progress-repository";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { StudentTaskProgressRow } from "@/types/database";

export class SupabaseStudentTaskProgressRepository implements StudentTaskProgressRepository {
  async upsert(row: StudentTaskProgressUpsert) {
    const { error } = await getSupabaseAdmin()
      .from("student_task_progress")
      .upsert(row, { onConflict: "student_id,task_id,video_id" });
    throwIfPostgrestError(error);
  }

  async listByTaskId(taskId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_task_progress")
      .select("*")
      .eq("task_id", taskId);
    throwIfPostgrestError(error);
    return data as StudentTaskProgressRow[];
  }

  async listByTaskAndStudent(taskId: string, studentId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_task_progress")
      .select("*")
      .eq("task_id", taskId)
      .eq("student_id", studentId);
    throwIfPostgrestError(error);
    return data as StudentTaskProgressRow[];
  }
}
