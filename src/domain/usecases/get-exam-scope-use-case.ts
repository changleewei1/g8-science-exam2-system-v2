import type { ExamScopeRepository } from "@/domain/repositories";
import type { ScopeUnitRepository } from "@/domain/repositories";

export class GetExamScopeUseCase {
  constructor(
    private readonly scopes: ExamScopeRepository,
    private readonly units: ScopeUnitRepository,
  ) {}

  async execute(scopeId: string) {
    const scope = await this.scopes.findById(scopeId);
    if (!scope || !scope.isAvailable()) return null;
    const unitList = await this.units.findByExamScopeId(scopeId);
    return { scope, units: unitList };
  }
}
