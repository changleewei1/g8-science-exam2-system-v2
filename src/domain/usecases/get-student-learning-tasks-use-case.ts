import type { LearningTaskService } from "@/domain/services/learning-task-service";

export class GetStudentLearningTasksUseCase {
  constructor(private readonly service: LearningTaskService) {}

  execute(studentId: string) {
    return this.service.getStudentTasks(studentId);
  }
}
