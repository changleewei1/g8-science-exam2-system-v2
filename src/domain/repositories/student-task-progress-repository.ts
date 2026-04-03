import type { StudentTaskProgressRow } from "@/types/database";

export type StudentTaskProgressUpsert = {
  student_id: string;
  task_id: string;
  video_id: string;
  is_completed: boolean;
  completed_at: string | null;
};

export interface StudentTaskProgressRepository {
  upsert(row: StudentTaskProgressUpsert): Promise<void>;
  listByTaskId(taskId: string): Promise<StudentTaskProgressRow[]>;
  listByTaskAndStudent(taskId: string, studentId: string): Promise<StudentTaskProgressRow[]>;
}
