import type { LearningTaskRow, TaskVideoRow } from "@/types/database";

export type LearningTaskInsert = {
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  class_name: string;
  is_active: boolean;
};

export type TaskVideoInsert = {
  task_id: string;
  video_id: string;
  day_index: number;
};

export interface LearningTaskRepository {
  insertTask(row: LearningTaskInsert): Promise<{ id: string }>;
  insertTaskVideos(rows: TaskVideoInsert[]): Promise<void>;
  updateTask(
    id: string,
    row: Pick<
      LearningTaskInsert,
      "title" | "description" | "start_date" | "end_date" | "class_name" | "is_active"
    >,
  ): Promise<void>;
  deleteTaskVideosForTask(taskId: string): Promise<void>;
  /** 無指派名單時以整班為準；有名單時僅這些學生 */
  findAssigneeStudentIds(taskId: string): Promise<string[]>;
  replaceAssignees(taskId: string, studentIds: string[]): Promise<void>;
  findAll(): Promise<LearningTaskRow[]>;
  findById(id: string): Promise<LearningTaskRow | null>;
  findTaskVideos(taskId: string): Promise<TaskVideoRow[]>;
  /** 某影片出現在哪些任務（供進度同步） */
  findLinksByVideoId(videoId: string): Promise<{ taskId: string }[]>;
}
