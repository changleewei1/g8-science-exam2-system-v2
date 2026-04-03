import type { VideoRepository } from "@/domain/repositories";
import type { VideoProgressRepository } from "@/domain/repositories";
import type { QuizRepository } from "@/domain/repositories";

export class GetVideoDetailUseCase {
  constructor(
    private readonly videos: VideoRepository,
    private readonly progress: VideoProgressRepository,
    private readonly quizzes: QuizRepository,
  ) {}

  async execute(videoId: string, studentId: string) {
    const video = await this.videos.findById(videoId);
    if (!video) return null;
    const progress = await this.progress.findByStudentAndVideo(studentId, videoId);
    const quiz = await this.quizzes.findByVideoId(videoId);
    return { video, progress, quiz };
  }
}
