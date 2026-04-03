/**
 * 國二理化 v2：學號 = 班級代碼 + 座號兩碼（例：801 + 01 → 80101）
 * 密碼：SciG8-01、SciG8-02…（座號兩碼）
 */
export function buildStudentCode(className: string, seat: number): string {
  const cls = className.trim();
  const s = Math.max(1, Math.floor(seat));
  return `${cls}${String(s).padStart(2, "0")}`;
}

export function generateSciG8Password(seat: number): string {
  const s = Math.max(1, Math.floor(seat));
  return `SciG8-${String(s).padStart(2, "0")}`;
}

export function parseSeatFromStudentCode(className: string, studentCode: string): number | null {
  const cls = className.trim();
  if (!studentCode.startsWith(cls)) return null;
  const rest = studentCode.slice(cls.length);
  if (!/^\d{1,3}$/.test(rest)) return null;
  const n = parseInt(rest, 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function nextSeatForClass(className: string, existingCodes: string[]): number {
  const cls = className.trim();
  let max = 0;
  for (const code of existingCodes) {
    const seat = parseSeatFromStudentCode(cls, code);
    if (seat != null && seat > max) max = seat;
  }
  return max + 1;
}
