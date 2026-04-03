import type { SkillTag } from "@/domain/entities";

export interface SkillTagRepository {
  findAll(): Promise<SkillTag[]>;
  findByCode(code: string): Promise<SkillTag | null>;
  upsertMany(tags: SkillTagUpsert[]): Promise<void>;
}

export type SkillTagUpsert = {
  code: string;
  name: string;
  unit: string;
  category: string | null;
  difficulty: string | null;
  domain?: string | null;
};
