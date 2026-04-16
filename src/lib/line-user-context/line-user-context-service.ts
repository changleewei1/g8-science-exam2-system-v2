import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

import type { LineUserContextRow } from "@/types/database";

export type PendingParentAction =
  | "homework_status"
  | "learning_performance"
  | "video_recommendation";

/** 預設 15 分鐘 */
const DEFAULT_TTL_MS = 15 * 60 * 1000;

function mapRow(raw: Record<string, unknown>): LineUserContextRow {
  return raw as unknown as LineUserContextRow;
}

export function isLineUserContextExpired(row: LineUserContextRow): boolean {
  return new Date(row.expires_at).getTime() <= Date.now();
}

export async function getLineUserContext(
  lineUserId: string,
): Promise<LineUserContextRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("line_user_contexts")
    .select("*")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (error) {
    console.error("[line_user_contexts] get", error.message);
    return null;
  }
  if (!data) return null;
  return mapRow(data as Record<string, unknown>);
}

export async function setLineUserContext(input: {
  lineUserId: string;
  pendingAction: PendingParentAction;
  pendingStudentId?: string | null;
  pendingStudentName?: string | null;
  ttlMs?: number;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const ttl = input.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = new Date(Date.now() + ttl).toISOString();
  const now = new Date().toISOString();

  const { error } = await supabase.from("line_user_contexts").upsert(
    {
      line_user_id: input.lineUserId,
      pending_action: input.pendingAction,
      pending_student_id: input.pendingStudentId ?? null,
      pending_student_name: input.pendingStudentName ?? null,
      expires_at: expiresAt,
      updated_at: now,
    },
    { onConflict: "line_user_id" },
  );

  if (error) {
    console.error("[line_user_contexts] upsert", error.message);
    throw new Error(error.message);
  }
}

export async function clearLineUserContext(lineUserId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("line_user_contexts")
    .delete()
    .eq("line_user_id", lineUserId);
  if (error) {
    console.error("[line_user_contexts] delete", error.message);
    throw new Error(error.message);
  }
}
