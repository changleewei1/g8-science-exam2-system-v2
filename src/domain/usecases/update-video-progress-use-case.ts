import type { VideoTrackingService } from "@/domain/services/video-tracking-service";

export class UpdateVideoProgressUseCase {
  constructor(private readonly tracking: VideoTrackingService) {}

  execute(input: Parameters<VideoTrackingService["updateProgress"]>[0]) {
    return this.tracking.updateProgress(input);
  }
}
