/**
 * 僅在執行期讀取環境變數，避免 import 時拋錯。
 */
export function getEnv(name: string): string | undefined {
  if (typeof process === "undefined") return undefined;
  return process.env[name];
}

export function requireEnv(name: string): string {
  const v = getEnv(name);
  if (!v) {
    throw new Error(
      `系統設定未完成：缺少環境變數「${name}」。請在部署平台（如 Vercel）設定後重新部署，或聯絡管理員。`,
    );
  }
  return v;
}
