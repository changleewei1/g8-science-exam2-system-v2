import type { LearningTaskService } from "@/domain/services/learning-task-service";

export class GetAdminTaskProgressDetailUseCase {
  constructor(private readonly service: LearningTaskService) {}

  execute(taskId: string) {
    return this.service.getAdminTaskProgressDetail(taskId);
  }
}
