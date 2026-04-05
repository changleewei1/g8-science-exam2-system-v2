import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { normalizeReportToken } from "@/lib/report-token";

/**
 * 家長分享連結：建立 token、解析 token。
 */
export class ReportLinkService {
  /**
   * 取得有效分享 token：若已有未過期 token 則直接回傳，避免重複建立。
   */
  async ensureShareLink(input: {
    studentId: string;
    taskId?: string | null;
    expiresInDays?: number | null;
  }): Promise<{ token: string; created: boolean }> {
    const supabase = getSupabaseAdmin();
    const { data: rows } = await supabase
      .from("student_report_tokens")
      .select("token, expires_at, created_at")
      .eq("student_id", input.studentId)
      .order("created_at", { ascending: false });

    const now = Date.now();
    for (const raw of rows ?? []) {
      const row = raw as { token: string; expires_at: string | null; created_at: string };
      const ok = !row.expires_at || new Date(row.expires_at).getTime() > now;
      if (ok) {
        return { token: row.token, created: false };
      }
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt =
      input.expiresInDays != null && input.expiresInDays > 0
        ? new Date(Date.now() + input.expiresInDays * 86400000).toISOString()
        : null;

    const { error } = await supabase.from("student_report_tokens").insert({
      student_id: input.studentId,
      task_id: input.taskId ?? null,
      token,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);
    return { token, created: true };
  }

  async resolveToken(token: string): Promise<{ studentId: string; taskId: string | null } | null> {
    const key = normalizeReportToken(token);
    if (!key) return null;
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("student_report_tokens")
      .select("student_id, task_id, expires_at")
      .eq("token", key)
      .maybeSingle();
    if (!data) return null;
    const row = data as {
      student_id: string;
      task_id: string | null;
      expires_at: string | null;
    };
    if (row.expires_at && new Date(row.expires_at) < new Date()) return null;
    return { studentId: row.student_id, taskId: row.task_id };
  }
}
