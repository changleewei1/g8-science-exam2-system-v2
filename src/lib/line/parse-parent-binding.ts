import { normalizeClassName } from "@/lib/line/normalize-class-name";

export type ParentBindingRole = "father" | "mother";

export type ParseParentBindingOk = {
  ok: true;
  /** 使用者輸入之班級片段（已自「我是…的」取出），比對前請再經 normalizeClassName */
  classSegment: string;
  /** 姓名（已 trim，內部連續空白收斂） */
  studentName: string;
  role: ParentBindingRole;
};

export type ParseParentBindingErr = {
  ok: false;
  reason: "format";
};

export type ParseParentBindingResult = ParseParentBindingOk | ParseParentBindingErr;

/**
 * 解析「我是702王小明的爸爸／媽媽」格式。
 * 班級為連續數字（可含全形數字）＋選填「班」；其餘為姓名。
 * 允許「我是」與班級、姓名之間含半形／全形空白（與手機輸入習慣一致）。
 */
export function parseParentBindingText(raw: string): ParseParentBindingResult {
  const text = raw
    .trim()
    .replace(/[\u3000\u00a0]/g, " ")
    .replace(/\s+/g, " ");
  const re =
    /^我是\s*([\d\uFF10-\uFF19]+班?)\s*(.+?)\s*的\s*(爸爸|媽媽)\s*$/u;
  const m = text.match(re);
  if (!m) {
    return { ok: false, reason: "format" };
  }
  const classSegment = m[1].trim();
  const studentName = m[2].trim().replace(/\s+/g, "");
  const roleRaw = m[3];
  if (!studentName) {
    return { ok: false, reason: "format" };
  }
  const role: ParentBindingRole = roleRaw === "爸爸" ? "father" : "mother";
  return {
    ok: true,
    classSegment,
    studentName,
    role,
  };
}

/** 將使用者輸入的班級片段轉成與 DB 比對用之鍵 */
export function normalizedClassKeyFromBinding(parsed: ParseParentBindingOk): string {
  return normalizeClassName(parsed.classSegment);
}
