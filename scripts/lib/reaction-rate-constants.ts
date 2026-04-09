/**
 * 反應速率單元（skill_tags.unit = reaction_rate）— 與 supabase/seed.sql 之 RS01–RS11 對齊
 */
export const REACTION_RATE_SCOPE_UNIT_ID = "b0000001-0000-4000-8000-000000000003";

export const REACTION_RATE_UNIT_SLUG = "reaction_rate";

export const REACTION_RATE_BANK_UNIT_TITLE = "反應速率";

/** RS01 … RS11 */
export const REACTION_RATE_SKILL_CODES: ReadonlySet<string> = new Set(
  Array.from({ length: 11 }, (_, i) => `RS${String(i + 1).padStart(2, "0")}`),
);

export function isReactionRateSkillCode(code: string): boolean {
  return REACTION_RATE_SKILL_CODES.has(code.trim().toUpperCase());
}
