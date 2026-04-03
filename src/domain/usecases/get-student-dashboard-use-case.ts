import type { ExamScopeRepository } from "@/domain/repositories";
import type { ScopeUnitRepository } from "@/domain/repositories";
import type { StudentLearningService } from "@/domain/services/student-learning-service";

export class GetStudentDashboardUseCase {
  constructor(
    private readonly scopes: ExamScopeRepository,
    private readonly units: ScopeUnitRepository,
    private readonly learning: StudentLearningService,
  ) {}

  async execute(studentId: string, scopeId: string) {
    const scope = await this.scopes.findById(scopeId);
    if (!scope) return null;
    const unitList = await this.units.findByExamScopeId(scopeId);
    const videoCompletion = await this.learning.getVideoCompletionRate(studentId, scopeId);
    const quizPass = await this.learning.getQuizPassRate(studentId, scopeId);
    const skills = await this.learning.getSkillAccuracies(studentId);
    return { scope, units: unitList, videoCompletion, quizPass, skills };
  }
}
