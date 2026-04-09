/**
 * 與 src/lib/acid-base-skills.ts 同步：匯出／同步腳本專用
 */
export const ACID_BASE_SKILL_CODES: ReadonlySet<string> = new Set([
  ...["01", "02", "03", "04", "05", "06"].map((n) => `EL${n}`),
  ...["01", "02", "03", "04", "05", "06"].map((n) => `AB${n}`),
  ...["01", "02", "03", "04", "05"].map((n) => `CO${n}`),
  ...["01", "02", "03", "04", "05"].map((n) => `NE${n}`),
]);

export const ACID_BASE_SCOPE_UNIT_ID = "b0000001-0000-4000-8000-000000000002";

export function isAcidBaseSkillCode(code: string): boolean {
  return ACID_BASE_SKILL_CODES.has(code.trim().toUpperCase());
}
