import type { QuizService } from "@/domain/services/quiz-service";

export class GetQuizDetailUseCase {
  constructor(private readonly quiz: QuizService) {}

  execute(quizId: string, studentId: string) {
    return this.quiz.getQuizByQuizId(quizId, studentId);
  }
}
