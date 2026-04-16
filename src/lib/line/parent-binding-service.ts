import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { normalizeClassName } from "@/lib/line/normalize-class-name";
import type { ParentBindingRole } from "@/lib/line/parse-parent-binding";

export type ParentBindingOutcome =
  | { status: "bound" }
  | { status: "already_bound" }
  | { status: "not_found" }
  | { status: "duplicate" }
  | { status: "parent_limit" }
  | { status: "error"; message: string };

/**
 * 綁定家長與學生。
 *
 * **每位學生最多兩位家長（MVP）**：以 `COUNT(*)` + `INSERT` 實作。
 * **併發風險**：兩個請求同時為同一 student 執行 COUNT 時皆可能 < 2，導致短暫插入超過兩筆。
 * **第二階段建議**：
 * - PostgreSQL：以 `INSERT ...` 搭配 `CHECK` 與子查詢計數（或 `BEFORE INSERT` trigger）強制上限；
 * - 或交易內 `SELECT COUNT(*) FROM parent_line_subscribers WHERE student_id = $1 FOR UPDATE` 再 insert；
 * - 或 partial unique index 搭配「角色槽位」等較嚴格模型。
 */
export async function bindParentLineSubscriber(input: {
  lineUserId: string;
  normalizedClassKey: string;
  studentNameNormalized: string;
  role: ParentBindingRole;
}): Promise<ParentBindingOutcome> {
  const supabase = getSupabaseAdmin();

  const { data: rows, error: fetchErr } = await supabase
    .from("students")
    .select("id, class_name, name")
    .eq("is_active", true);

  if (fetchErr) {
    return { status: "error", message: fetchErr.message };
  }

  const matches =
    rows?.filter((r) => {
      const cn = r.class_name ? normalizeClassName(r.class_name) : "";
      const nm = normalizeStudentNameForMatch(r.name);
      return (
        cn === input.normalizedClassKey &&
        nm === input.studentNameNormalized
      );
    }) ?? [];

  if (matches.length === 0) {
    return { status: "not_found" };
  }
  if (matches.length > 1) {
    return { status: "duplicate" };
  }

  const studentId = matches[0].id as string;

  const { data: existing } = await supabase
    .from("parent_line_subscribers")
    .select("id")
    .eq("line_user_id", input.lineUserId)
    .eq("student_id", studentId)
    .eq("is_active", true)
    .maybeSingle();

  if (existing) {
    return { status: "already_bound" };
  }

  const { count, error: countErr } = await supabase
    .from("parent_line_subscribers")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("is_active", true);

  if (countErr) {
    return { status: "error", message: countErr.message };
  }
  if ((count ?? 0) >= 2) {
    return { status: "parent_limit" };
  }

  const { error: insertErr } = await supabase.from("parent_line_subscribers").insert({
    line_user_id: input.lineUserId,
    student_id: studentId,
    role: input.role,
    is_active: true,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { status: "already_bound" };
    }
    return { status: "error", message: insertErr.message };
  }

  return { status: "bound" };
}

/** 與姓名比對：trim 並去除中間空白（與 parse 後之 studentName 一致） */
export function normalizeStudentNameForMatch(name: string): string {
  return name.trim().replace(/\s+/g, "");
}
