import type { QuizAttemptRepository } from "@/domain/repositories";
import type { QuizQuestionRepository } from "@/domain/repositories";
import type { QuizRepository } from "@/domain/repositories";
import type { VideoRepository } from "@/domain/repositories";

export class GetQuizAttemptDetailUseCase {
  constructor(
    private readonly attempts: QuizAttemptRepository,
    private readonly quizzes: QuizRepository,
    private readonly questions: QuizQuestionRepository,
    private readonly videos: VideoRepository,
  ) {}

  async execute(attemptId: string, studentId: string) {
    const attempt = await this.attempts.findById(attemptId);
    if (!attempt || attempt.studentId !== studentId) return null;
    const quiz = await this.quizzes.findById(attempt.quizId);
    if (!quiz) return null;
    const video = await this.videos.findById(quiz.videoId);
    const qs = await this.questions.findByQuizId(quiz.id);
    const ans = await this.attempts.listAnswersByAttemptId(attemptId);
    const answerMap = new Map(ans.map((a) => [a.question_id, a]));
    return { attempt, quiz, video, questions: qs, answers: answerMap };
  }
}
