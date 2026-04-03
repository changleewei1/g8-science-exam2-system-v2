import type { VideoRepository } from "@/domain/repositories";
import type { VideoProgressRepository } from "@/domain/repositories";
import type { QuizRepository } from "@/domain/repositories";
import type { QuizAttemptRepository } from "@/domain/repositories";

export class ListUnitVideosUseCase {
  constructor(
    private readonly videos: VideoRepository,
    private readonly progress: VideoProgressRepository,
    private readonly quizzes: QuizRepository,
    private readonly attempts: QuizAttemptRepository,
  ) {}

  async execute(unitId: string, studentId: string) {
    const list = await this.videos.findByUnitId(unitId);
    const enriched = await Promise.all(
      list.map(async (v) => {
        const prog = await this.progress.findByStudentAndVideo(studentId, v.id);
        const quiz = await this.quizzes.findByVideoId(v.id);
        let quizPassed = false;
        if (quiz) {
          const latest = await this.attempts.findLatestByStudentAndQuiz(studentId, quiz.id);
          quizPassed = latest?.isPassed ?? false;
        }
        return {
          video: v,
          completionRate: prog?.completionRate ?? 0,
          isCompleted: prog?.isCompleted ?? false,
          canTakeQuiz: prog?.canTakeQuiz() ?? false,
          quizId: quiz?.id ?? null,
          quizPassed,
        };
      }),
    );
    return enriched;
  }
}
