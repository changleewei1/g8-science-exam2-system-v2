export class VideoProgress {
  constructor(
    public readonly id: string,
    public readonly studentId: string,
    public readonly videoId: string,
    public watchSeconds: number,
    public lastPositionSeconds: number,
    public completionRate: number,
    public isCompleted: boolean,
    public firstViewedAt: Date | null,
    public lastViewedAt: Date | null,
    public completedAt: Date | null,
    public viewCount: number,
  ) {}

  updateProgress(currentSeconds: number, durationSeconds: number): void {
    const dur = Math.max(durationSeconds, 1);
    const rate = Math.min(100, (currentSeconds / dur) * 100);
    this.completionRate = Math.max(this.completionRate, rate);
    this.lastPositionSeconds = currentSeconds;
    this.watchSeconds = Math.max(this.watchSeconds, currentSeconds);
    const now = new Date();
    if (!this.firstViewedAt) this.firstViewedAt = now;
    this.lastViewedAt = now;
    if (rate >= 90) {
      this.markCompleted();
    }
  }

  markCompleted(): void {
    this.isCompleted = true;
    this.completionRate = Math.max(this.completionRate, 90);
    if (!this.completedAt) this.completedAt = new Date();
  }

  canTakeQuiz(): boolean {
    return this.completionRate >= 90 || this.isCompleted;
  }

  incrementViewCount(): void {
    this.viewCount += 1;
  }
}
