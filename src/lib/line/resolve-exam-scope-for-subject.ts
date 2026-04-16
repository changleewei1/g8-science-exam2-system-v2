import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

import type { SubjectCode } from "@/lib/line-user-context/parse-subject-input";

/**
 * MVP：「理化」對應可產出報告之段考範圍；其他科目目前不連動資料庫。
 * 優先找 title/subject 含「理化」之 active scope，否則退回第一筆 active scope（與舊版 buildReport 預設一致）。
 */
export async function resolveExamScopeIdForSubjectCode(
  code: SubjectCode,
): Promise<string | null> {
  if (code === "math" || code === "english") return null;

  const supabase = getSupabaseAdmin();

  const { data: hit } = await supabase
    .from("exam_scopes")
    .select("id")
    .eq("is_active", true)
    .or("subject.ilike.%理化%,title.ilike.%理化%")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if ((hit as { id?: string } | null)?.id) {
    return (hit as { id: string }).id;
  }

  const { data: fallback } = await supabase
    .from("exam_scopes")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return ((fallback as { id?: string } | null)?.id as string) ?? null;
}
