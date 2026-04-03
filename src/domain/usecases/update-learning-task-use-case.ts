import type { LearningTaskService, CreateLearningTaskInput } from "@/domain/services/learning-task-service";

export class UpdateLearningTaskUseCase {
  constructor(private readonly service: LearningTaskService) {}

  execute(taskId: string, input: CreateLearningTaskInput) {
    return this.service.updateTask(taskId, input);
  }
}
