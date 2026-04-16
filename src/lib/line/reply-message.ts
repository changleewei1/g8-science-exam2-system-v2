import { getEnv } from "@/lib/env";

export type LineMessage = Record<string, unknown>;

/**
 * LINE Messaging API：reply（同一 replyToken 僅能使用一次）。
 * 需設定 `LINE_CHANNEL_ACCESS_TOKEN`，否則會拋錯（終端機會印出提示）。
 */
export async function replyLineMessages(
  replyToken: string,
  messages: LineMessage[],
): Promise<void> {
  const token = getEnv("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) {
    console.error(
      "[LINE] 缺少 LINE_CHANNEL_ACCESS_TOKEN：請在 LINE Developers → Messaging API 建立 Channel access token，並寫入 .env.local 後重啟 npm run dev。",
    );
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN_MISSING");
  }
  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE reply failed: ${res.status} ${text}`);
  }
}
