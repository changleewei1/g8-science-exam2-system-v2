import type { QuizQuestion } from "@/domain/entities";

export interface QuizQuestionRepository {
  findByQuizId(quizId: string): Promise<QuizQuestion[]>;
  insertMany(questions: QuizQuestionInsert[]): Promise<void>;
}

export type QuizQuestionInsert = {
  id?: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
  difficulty: string | null;
  skill_code: string;
};
