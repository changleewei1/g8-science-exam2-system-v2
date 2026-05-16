import type { VideoProgress } from "@/domain/entities";

export interface VideoProgressRepository {
  findByStudentAndVideo(studentId: string, videoId: string): Promise<VideoProgress | null>;
  upsert(progress: VideoProgressUpsert): Promise<VideoProgress>;
  findByStudentId(studentId: string): Promise<VideoProgress[]>;
  countCompletedByStudent(studentId: string): Promise<number>;
  /** 測驗通過後標記影片完成（不降低既有觀看進度） */
  markCompletedFromQuizPass(studentId: string, videoId: string): Promise<void>;
}

export type VideoProgressUpsert = {
  id?: string;
  student_id: string;
  video_id: string;
  watch_seconds: number;
  last_position_seconds: number;
  completion_rate: number;
  is_completed: boolean;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  completed_at: string | null;
  view_count: number;
};
