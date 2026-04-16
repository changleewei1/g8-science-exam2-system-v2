import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export async function logLineMessage(input: {
  lineUserId: string | null;
  direction: "inbound" | "outbound";
  messageType: string | null;
  textPreview: string | null;
  lineMessageId: string | null;
  replyToken: string | null;
  status: "ok" | "error" | "skipped";
  errorMessage: string | null;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("line_message_send_logs").insert({
    line_user_id: input.lineUserId,
    direction: input.direction,
    message_type: input.messageType,
    text_preview: input.textPreview?.slice(0, 500) ?? null,
    line_message_id: input.lineMessageId,
    reply_token: input.replyToken,
    status: input.status,
    error_message: input.errorMessage?.slice(0, 2000) ?? null,
  });
  if (error) {
    console.error("[line_message_send_logs]", error.message);
  }
}
