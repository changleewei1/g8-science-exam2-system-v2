import type { QuizService } from "@/domain/services/quiz-service";

export class GetQuizByVideoUseCase {
  constructor(private readonly quiz: QuizService) {}

  execute(videoId: string, studentId: string) {
    return this.quiz.getQuizForVideo(videoId, studentId);
  }
}
