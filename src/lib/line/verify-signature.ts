import { createHmac, timingSafeEqual } from "crypto";

import { getEnv } from "@/lib/env";

/**
 * 驗證 LINE Webhook `X-Line-Signature`（HMAC-SHA256 body + Channel secret，Base64）。
 *
 * **正式部署必須啟用驗簽**；本機測試可設 `LINE_WEBHOOK_SKIP_VERIFY=true`（僅在非 production 生效，見 `shouldVerifyLineWebhook`）。
 */
export function verifyLineSignature(
  rawBody: string,
  xLineSignature: string | null,
  channelSecret: string,
): boolean {
  if (!xLineSignature) return false;
  const digest = createHmac("sha256", channelSecret)
    .update(rawBody, "utf8")
    .digest("base64");
  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(xLineSignature, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * 是否應執行驗簽：`NODE_ENV === 'production'` 時一律驗簽。
 * 非 production 且 `LINE_WEBHOOK_SKIP_VERIFY=true` 時略過（方便 ngrok／本機）。
 */
export function shouldVerifyLineWebhook(): boolean {
  if (process.env.NODE_ENV === "production") {
    return true;
  }
  if (getEnv("LINE_WEBHOOK_SKIP_VERIFY") === "true") {
    return false;
  }
  return true;
}
