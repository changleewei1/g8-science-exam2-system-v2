/** 酸鹼中和單元技能代碼（與 skill_tags.unit = acid_base 對應；不含 reaction_rate） */
const CODES = [
  ...["01", "02", "03", "04", "05", "06"].map((n) => `EL${n}`),
  ...["01", "02", "03", "04", "05", "06"].map((n) => `AB${n}`),
  ...["01", "02", "03", "04", "05"].map((n) => `CO${n}`),
  ...["01", "02", "03", "04", "05"].map((n) => `NE${n}`),
] as const;

export const ACID_BASE_SKILL_CODES: ReadonlySet<string> = new Set(
  CODES.map((c) => c.toUpperCase()),
);

/** 酸鹼中和 scope_unit.id（playlist-config / seed） */
export const ACID_BASE_SCOPE_UNIT_ID = "b0000001-0000-4000-8000-000000000002";

export function isAcidBaseSkillCode(skillCode: string | null | undefined): boolean {
  if (!skillCode) return false;
  return ACID_BASE_SKILL_CODES.has(skillCode.trim().toUpperCase());
}
