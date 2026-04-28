import { getEnv } from "@/lib/env";

import type { LineMessage } from "@/lib/line/reply-message";

/**
 * LINE Messaging API：push（不需 replyToken；需使用者曾與 Bot 對話）。
 */
export async function pushLineMessages(
  lineUserId: string,
  messages: LineMessage[],
): Promise<void> {
  const token = getEnv("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) {
    console.error(
      "[LINE] pushLineMessages: 缺少 LINE_CHANNEL_ACCESS_TOKEN",
    );
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN_MISSING");
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ to: lineUserId, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE push failed: ${res.status} ${text}`);
  }
}
