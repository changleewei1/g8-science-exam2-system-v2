import type { QuizQuestion } from "@/domain/entities";

/** 老師端同步「恰好三題」測驗內容（以 update 為主，保留題目 id 與歷史作答關聯） */
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
};

export interface QuizQuestionRepository {
  findByQuizId(quizId: string): Promise<QuizQuestion[]>;
  insertMany(questions: QuizQuestionInsert[]): Promise<void>;
  syncExactlyThreeForQuiz(quizId: string, items: QuizQuestionSyncPayload[]): Promise<void>;
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
