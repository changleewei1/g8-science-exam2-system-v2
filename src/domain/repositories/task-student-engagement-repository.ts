import type { TaskStudentProgressRow } from "@/types/database";

export interface TaskStudentEngagementRepository {
  /** 標記學生已進入任務頁（任務層級，寫入 task_student_progress） */
  markTaskOpened(studentId: string, taskId: string): Promise<void>;
  /** 查詢該學生在各任務的開啟紀錄 */
  listByStudent(studentId: string): Promise<TaskStudentProgressRow[]>;
}
