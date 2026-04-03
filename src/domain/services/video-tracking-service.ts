import { VideoProgress } from "@/domain/entities";
import type { VideoProgressRepository, VideoProgressUpsert } from "@/domain/repositories";
import type { VideoRepository } from "@/domain/repositories";

export type ProgressUpdateInput = {
  studentId: string;
  videoId: string;
  currentTimeSeconds: number;
  durationSeconds: number;
  incrementView?: boolean;
};

/** 影片完成時同步學習任務進度（可選） */
export type LearningTaskProgressSync = {
  syncOnVideoCompleted(
    studentId: string,
    videoId: string,
    completedAt: Date | null,
  ): Promise<void>;
};

export class VideoTrackingService {
  constructor(
    private readonly progressRepo: VideoProgressRepository,
    private readonly videoRepo: VideoRepository,
    private readonly learningTaskSync: LearningTaskProgressSync | null = null,
  ) {}

  async updateProgress(input: ProgressUpdateInput): Promise<{
    progress: VideoProgress;
    canTakeQuiz: boolean;
  }> {
    const video = await this.videoRepo.findById(input.videoId);
    const duration =
      input.durationSeconds > 0
        ? input.durationSeconds
        : Math.max(video?.durationSeconds ?? 1, 1);

    let entity = await this.progressRepo.findByStudentAndVideo(input.studentId, input.videoId);

    if (!entity) {
      entity = new VideoProgress(
        "",
        input.studentId,
        input.videoId,
        0,
        0,
        0,
        false,
        null,
        null,
        null,
        0,
      );
      if (input.incrementView) entity.incrementViewCount();
    } else if (input.incrementView) {
      entity.incrementViewCount();
    }

    entity.updateProgress(input.currentTimeSeconds, duration);

    const row: VideoProgressUpsert = {
      student_id: input.studentId,
      video_id: input.videoId,
      watch_seconds: entity.watchSeconds,
      last_position_seconds: entity.lastPositionSeconds,
      completion_rate: entity.completionRate,
      is_completed: entity.isCompleted,
      first_viewed_at: entity.firstViewedAt?.toISOString() ?? null,
      last_viewed_at: entity.lastViewedAt?.toISOString() ?? null,
      completed_at: entity.completedAt?.toISOString() ?? null,
      view_count: entity.viewCount,
    };

    const saved = await this.progressRepo.upsert(row);
    if (saved.isCompleted && this.learningTaskSync) {
      await this.learningTaskSync.syncOnVideoCompleted(
        input.studentId,
        input.videoId,
        saved.completedAt,
      );
    }
    return { progress: saved, canTakeQuiz: saved.canTakeQuiz() };
  }
}
