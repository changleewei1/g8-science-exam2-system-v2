/**
 * 正式環境公開網址（家長報告連結、OAuth 等 server 端需絕對 URL 時使用）。
 *
 * 優先順序：
 * 1. APP_BASE_URL 或 NEXT_PUBLIC_APP_URL（建議在 Vercel 設定，含 https://）
 * 2. VERCEL_URL（Vercel 自動注入，無協定）
 * 3. Request 的 x-forwarded-host / host（Edge / API Route 請求）
 *
 * 請勿在 client 元件暴露 SERVICE_ROLE_KEY；本函數僅供 server / route handler 使用。
 */
export function resolvePublicOrigin(req: Request): string {
  const explicit =
    process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  if (host) {
    return `${proto}://${host}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error(
    "PUBLIC_BASE_URL_MISSING: 無法推斷公開網址。請在部署環境設定 APP_BASE_URL 或 NEXT_PUBLIC_APP_URL（含 https://）。",
  );
}

/**
 * 使用 /report?t=… 避免 token 在路徑內被截斷、編碼或 App /router 解析異常；家長無需登入即可開啟。
 */
export function publicReportPageUrl(req: Request, token: string): string {
  const base = resolvePublicOrigin(req);
  const q = new URLSearchParams({ t: token });
  return `${base}/report?${q.toString()}`;
}

/**
 * 背景 job 無 Request 時組 /report?t=… 絕對 URL（與 publicReportPageUrl 邏輯對齊）。
 */
export function publicReportPageUrlFromEnv(token: string): string {
  const base = resolvePublicOriginWithoutRequest();
  const q = new URLSearchParams({ t: token });
  return `${base}/report?${q.toString()}`;
}

function resolvePublicOriginWithoutRequest(): string {
  const explicit =
    process.env.APP_BASE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//, "");
    return `https://${host}`;
  }

  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }

  throw new Error(
    "PUBLIC_BASE_URL_MISSING: 無法推斷公開網址。請設定 APP_BASE_URL 或 NEXT_PUBLIC_APP_URL（含 https://）。",
  );
}
