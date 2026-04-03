import type { LearningTaskService, CreateLearningTaskInput } from "@/domain/services/learning-task-service";

export class CreateLearningTaskUseCase {
  constructor(private readonly service: LearningTaskService) {}

  execute(input: CreateLearningTaskInput) {
    return this.service.createTask(input);
  }
}
