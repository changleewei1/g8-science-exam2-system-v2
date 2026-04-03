import type { LearningTaskService } from "@/domain/services/learning-task-service";

export class GetAdminLearningTaskDetailUseCase {
  constructor(private readonly service: LearningTaskService) {}

  execute(taskId: string) {
    return this.service.getAdminTaskDetail(taskId);
  }
}
