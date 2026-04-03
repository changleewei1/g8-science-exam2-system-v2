import type { Quiz } from "@/domain/entities";

export interface QuizRepository {
  findById(id: string): Promise<Quiz | null>;
  findByVideoId(videoId: string): Promise<Quiz | null>;
  insert(quiz: QuizInsert): Promise<{ id: string }>;
}

export type QuizInsert = {
  id?: string;
  video_id: string;
  title: string;
  description: string | null;
  pass_score: number;
  question_count: number;
  is_active: boolean;
};
