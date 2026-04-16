/**
 * 班級字串正規化：與 students.class_name 比對前使用。
 * - 去除前後與中間空白
 * - 全形數字（０–９）轉半形
 * - 去除「班」字（含重複比對時對 DB 端亦應以同規則處理）
 */
export function normalizeClassName(input: string): string {
  let s = input.trim().replace(/\s+/g, "");
  s = s.replace(/[\uFF10-\uFF19]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
  );
  s = s.replace(/班/g, "");
  return s.trim();
}
