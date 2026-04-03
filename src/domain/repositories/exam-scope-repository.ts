import type { ExamScope } from "@/domain/entities";

export interface ExamScopeRepository {
  findById(id: string): Promise<ExamScope | null>;
  findAllActive(): Promise<ExamScope[]>;
}
