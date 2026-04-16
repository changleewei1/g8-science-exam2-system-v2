import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type BoundStudentForLine = {
  studentId: string;
  displayName: string;
};

/**
 * 列出此 LINE 帳號綁定之所有學生（活躍），供多位學生時「姓名 + 科目」比對。
 */
export async function listBoundStudentsForLineUser(
  lineUserId: string,
): Promise<BoundStudentForLine[]> {
  const supabase = getSupabaseAdmin();
  const { data: subs, error } = await supabase
    .from("parent_line_subscribers")
    .select("student_id, updated_at")
    .eq("line_user_id", lineUserId)
    .eq("is_active", true)
    .order("updated_at", { ascending: true });

  if (error) {
    console.error("[listBoundStudentsForLineUser]", error.message);
    return [];
  }
  if (!subs?.length) return [];

  const ids = [...new Set(subs.map((s) => s.student_id as string))];
  const { data: students, error: e2 } = await supabase
    .from("students")
    .select("id, name")
    .in("id", ids)
    .eq("is_active", true);

  if (e2 || !students?.length) return [];

  const order = new Map(ids.map((id, i) => [id, i]));
  const rows = students as { id: string; name: string }[];
  rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return rows.map((r) => ({
    studentId: r.id,
    displayName: r.name,
  }));
}

export type ParentStudentContext =
  | {
      kind: "single";
      studentId: string;
      displayName: string;
      className: string | null;
    }
  | { kind: "none" }
  | {
      kind: "multiple";
      /** MVP：取 updated_at 最新之一筆作為查詢對象；其餘筆仍有效，未來可改為選單或關鍵字 */
      studentId: string;
      displayName: string;
      className: string | null;
      totalBindings: number;
    };

/**
 * 依 LINE userId 取得綁定學生（僅 is_active）。
 * 若同一使用者綁定多位學生，MVP 以 `updated_at` 最新者作為「小朋友學習狀況」查詢對象，並在回覆邏輯中可帶出提示。
 */
export async function getParentStudentByLineUser(
  lineUserId: string,
): Promise<ParentStudentContext> {
  const supabase = getSupabaseAdmin();

  const { data: subs, error } = await supabase
    .from("parent_line_subscribers")
    .select("student_id, updated_at")
    .eq("line_user_id", lineUserId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getParentStudentByLineUser]", error.message);
    return { kind: "none" };
  }
  if (!subs?.length) {
    return { kind: "none" };
  }

  const pick = subs[0];
  const studentId = pick.student_id as string;

  const { data: st } = await supabase
    .from("students")
    .select("id, name, class_name")
    .eq("id", studentId)
    .eq("is_active", true)
    .maybeSingle();

  if (!st) {
    return { kind: "none" };
  }

  const displayName = st.name as string;
  const className = (st.class_name as string | null) ?? null;

  if (subs.length > 1) {
    return {
      kind: "multiple",
      studentId,
      displayName,
      className,
      totalBindings: subs.length,
    };
  }

  return {
    kind: "single",
    studentId,
    displayName,
    className,
  };
}
