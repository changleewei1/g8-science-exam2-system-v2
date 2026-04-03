import type { LearningTaskService } from "@/domain/services/learning-task-service";

export class ListLearningTasksUseCase {
  constructor(private readonly service: LearningTaskService) {}

  execute() {
    return this.service.listTasks();
  }
}
