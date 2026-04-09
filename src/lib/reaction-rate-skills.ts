/** 反應速率技能代碼（RS01–RS11），供學生端顯示詳解等用途 */

const RS_CODES = new Set(
  Array.from({ length: 11 }, (_, i) => `RS${String(i + 1).padStart(2, "0")}`),
);

export function isReactionRateSkillCode(code: string): boolean {
  return RS_CODES.has(code.trim().toUpperCase());
}
