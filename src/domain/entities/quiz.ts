import type { VideoProgress } from "./video-progress";

export class Quiz {
  constructor(
    public readonly id: string,
    public readonly videoId: string,
    public readonly title: string,
    public readonly description: string | null,
    public readonly passScore: number,
    public readonly questionCount: number,
    public readonly isActive: boolean,
  ) {}

  canBeTaken(progress: VideoProgress): boolean {
    if (!this.isActive) return false;
    return progress.canTakeQuiz();
  }

  isPassed(score: number): boolean {
    return score >= this.passScore;
  }
}
