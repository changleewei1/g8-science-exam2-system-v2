import { getEnv } from "@/lib/env";

/**
 * 報告 builder 多半不會拿到 Request；這裡提供一個與 public-url.ts 同邏輯的 base origin。
 */
export function resolvePublicOriginWithoutRequest(): string {
  const explicit = getEnv("APP_BASE_URL")?.trim() || getEnv("NEXT_PUBLIC_APP_URL")?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = getEnv("VERCEL_URL")?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";

  throw new Error(
    "PUBLIC_BASE_URL_MISSING: 無法推斷公開網址。請設定 APP_BASE_URL 或 NEXT_PUBLIC_APP_URL（含 https://）。",
  );
}

