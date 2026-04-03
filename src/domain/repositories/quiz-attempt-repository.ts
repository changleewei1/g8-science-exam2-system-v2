import type { QuizAttempt } from "@/domain/entities";

export type AttemptAnswerRow = {
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
};

export interface QuizAttemptRepository {
  findById(id: string): Promise<QuizAttempt | null>;
  createAttempt(input: AttemptInsert): Promise<{ id: string }>;
  updateAttempt(id: string, score: number, isPassed: boolean, submittedAt: string): Promise<void>;
  insertAnswers(rows: AnswerInsert[]): Promise<void>;
  findLatestByStudentAndQuiz(studentId: string, quizId: string): Promise<QuizAttempt | null>;
  findByStudentId(studentId: string): Promise<QuizAttempt[]>;
  listAnswersByAttemptId(attemptId: string): Promise<AttemptAnswerRow[]>;
}

export type AttemptInsert = {
  student_id: string;
  quiz_id: string;
  score: number;
  is_passed: boolean;
  started_at: string | null;
  submitted_at: string | null;
};

export type AnswerInsert = {
  attempt_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
};
