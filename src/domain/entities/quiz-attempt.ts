import type { QuizQuestion } from "./quiz-question";

export type AnswerMap = Record<string, string>;

export class QuizAttempt {
  constructor(
    public readonly id: string,
    public readonly studentId: string,
    public readonly quizId: string,
    public score: number,
    public isPassed: boolean,
    public startedAt: Date | null,
    public submittedAt: Date | null,
  ) {}

  submit(answers: AnswerMap, questions: QuizQuestion[], passScore: number): void {
    let correct = 0;
    for (const q of questions) {
      const sel = answers[q.id] ?? "";
      if (q.isCorrect(sel)) correct += 1;
    }
    this.score = correct;
    this.isPassed = correct >= passScore;
    this.submittedAt = new Date();
  }

  calculateScore(answers: AnswerMap, questions: QuizQuestion[]): number {
    let correct = 0;
    for (const q of questions) {
      const sel = answers[q.id] ?? "";
      if (q.isCorrect(sel)) correct += 1;
    }
    return correct;
  }

  checkPass(passScore: number): boolean {
    return this.score >= passScore;
  }
}
