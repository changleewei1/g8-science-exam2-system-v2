import type {
  LearningTaskInsert,
  LearningTaskRepository,
  TaskVideoInsert,
} from "@/domain/repositories/learning-task-repository";
import {
  looksLikeMissingLearningTaskAssigneesTable,
  throwIfPostgrestError,
} from "@/lib/supabase-user-message";

type TaskUpdateRow = Pick<
  LearningTaskInsert,
  "title" | "description" | "start_date" | "end_date" | "class_name" | "is_active"
>;
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import type { LearningTaskRow, TaskVideoRow } from "@/types/database";

export class SupabaseLearningTaskRepository implements LearningTaskRepository {
  async insertTask(row: LearningTaskInsert) {
    const { data, error } = await getSupabaseAdmin()
      .from("learning_tasks")
      .insert(row)
      .select("id")
      .single();
    throwIfPostgrestError(error);
    return data as { id: string };
  }

  async insertTaskVideos(rows: TaskVideoInsert[]) {
    if (rows.length === 0) return;
    const { error } = await getSupabaseAdmin().from("task_videos").insert(rows);
    throwIfPostgrestError(error);
  }

  async updateTask(id: string, row: TaskUpdateRow) {
    const { error } = await getSupabaseAdmin().from("learning_tasks").update(row).eq("id", id);
    throwIfPostgrestError(error);
  }

  async deleteTaskVideosForTask(taskId: string) {
    const { error } = await getSupabaseAdmin().from("task_videos").delete().eq("task_id", taskId);
    throwIfPostgrestError(error);
  }

  async findAll() {
    const { data, error } = await getSupabaseAdmin()
      .from("learning_tasks")
      .select("*")
      .order("start_date", { ascending: false });
    throwIfPostgrestError(error);
    return data as LearningTaskRow[];
  }

  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("learning_tasks")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfPostgrestError(error);
    return (data as LearningTaskRow | null) ?? null;
  }

  async findTaskVideos(taskId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("task_videos")
      .select("*")
      .eq("task_id", taskId)
      .order("day_index", { ascending: true })
      .order("video_id", { ascending: true });
    throwIfPostgrestError(error);
    return data as TaskVideoRow[];
  }

  async findLinksByVideoId(videoId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("task_videos")
      .select("task_id")
      .eq("video_id", videoId);
    throwIfPostgrestError(error);
    return (data as { task_id: string }[]).map((r) => ({ taskId: r.task_id }));
  }

  async findAssigneeStudentIds(taskId: string) {
    try {
      const { data, error } = await getSupabaseAdmin()
        .from("learning_task_assignees")
        .select("student_id")
        .eq("task_id", taskId);
      throwIfPostgrestError(error);
      return (data as { student_id: string }[]).map((r) => r.student_id);
    } catch (e) {
      if (looksLikeMissingLearningTaskAssigneesTable(e)) return [];
      throw e;
    }
  }

  async replaceAssignees(taskId: string, studentIds: string[]) {
    const db = getSupabaseAdmin();
    try {
      const { error: delErr } = await db.from("learning_task_assignees").delete().eq("task_id", taskId);
      throwIfPostgrestError(delErr);
      if (studentIds.length === 0) return;
      const rows = studentIds.map((student_id) => ({ task_id: taskId, student_id }));
      const { error } = await db.from("learning_task_assignees").insert(rows);
      throwIfPostgrestError(error);
    } catch (e) {
      if (!looksLikeMissingLearningTaskAssigneesTable(e)) throw e;
      if (studentIds.length > 0) {
        throw new Error(
          "資料庫尚未建立「指派學生」資料表，無法儲存指定名單。請先執行 migration：20250404120000_learning_task_assignees_and_flags.sql（或執行 supabase db push）。",
        );
      }
    }
  }
}
