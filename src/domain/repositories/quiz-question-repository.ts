import type { QuizQuestion } from "@/domain/entities";

/** 老師端同步測驗題目（以 update 為主，保留題目 id 與歷史作答關聯；題數可變） */
export type QuizQuestionSyncPayload = {
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  difficulty: string | null;
  skill_code: string;
  question_image_url: string | null;
  reference_image_url: string | null;
  choice_a_image_url: string | null;
  choice_b_image_url: string | null;
  choice_c_image_url: string | null;
  choice_d_image_url: string | null;
};

export interface QuizQuestionRepository {
  findByQuizId(quizId: string): Promise<QuizQuestion[]>;
  insertMany(questions: QuizQuestionInsert[]): Promise<void>;
  syncQuestionsForQuiz(quizId: string, items: QuizQuestionSyncPayload[]): Promise<void>;
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
  question_image_url?: string | null;
  reference_image_url?: string | null;
  choice_a_image_url?: string | null;
  choice_b_image_url?: string | null;
  choice_c_image_url?: string | null;
  choice_d_image_url?: string | null;
};
