import type { AnswerMap } from "@/domain/entities";
import type { QuizService } from "@/domain/services/quiz-service";

export class SubmitQuizUseCase {
  constructor(private readonly quiz: QuizService) {}

  execute(quizId: string, studentId: string, answers: AnswerMap) {
    return this.quiz.submitQuiz(quizId, studentId, answers);
  }
}
