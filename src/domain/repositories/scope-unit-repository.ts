import type { ScopeUnit } from "@/domain/entities";

export interface ScopeUnitRepository {
  findById(id: string): Promise<ScopeUnit | null>;
  findByExamScopeId(examScopeId: string): Promise<ScopeUnit[]>;
}
