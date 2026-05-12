/**
 * 實驗功能開關（預設關閉）
 *
 * 1) `NEXT_PUBLIC_ENABLE_ADAPTIVE_PRACTICE`：會被 Next 編進 bundle；若使用 `npm run build` +
 *    `npm run start`，變更要 **重新 build** 才會反映。
 * 2) `LAB_ENABLE_ADAPTIVE_PRACTICE`：僅伺服器端讀取（不暴露給瀏覽器 bundle），適合本機 `next start` 只重啟
 *    就不必為了改開關而整包重 build。（與上列擇一或並用皆可，任一為開則啟用。）
 */
export function parseEnvTruthy(raw: string | undefined): boolean {
  if (raw == null) return false;
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes" || v === "on";
}

export function isAdaptivePracticeLabEnabled(): boolean {
  if (parseEnvTruthy(process.env.LAB_ENABLE_ADAPTIVE_PRACTICE)) return true;
  return parseEnvTruthy(process.env.NEXT_PUBLIC_ENABLE_ADAPTIVE_PRACTICE);
}

/** 開發除錯用：不洩漏金鑰，僅協助確認讀到哪個字面 */
export function adaptivePracticeLabFlagDebug(): {
  labServerRaw: string | undefined;
  nextPublicRaw: string | undefined;
  enabled: boolean;
} {
  return {
    labServerRaw: process.env.LAB_ENABLE_ADAPTIVE_PRACTICE,
    nextPublicRaw: process.env.NEXT_PUBLIC_ENABLE_ADAPTIVE_PRACTICE,
    enabled: isAdaptivePracticeLabEnabled(),
  };
}
