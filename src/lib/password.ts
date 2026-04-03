import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SALT_LEN = 16;
const KEY_LEN = 64;

/** 儲存格式：base64(salt).base64(hash) */
export function hashPassword(plain: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(plain, salt, KEY_LEN);
  return `${salt.toString("base64")}.${hash.toString("base64")}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const i = stored.indexOf(".");
  if (i <= 0) return false;
  const saltB64 = stored.slice(0, i);
  const hashB64 = stored.slice(i + 1);
  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltB64, "base64");
    expected = Buffer.from(hashB64, "base64");
  } catch {
    return false;
  }
  if (salt.length !== SALT_LEN || expected.length !== KEY_LEN) return false;
  const check = scryptSync(plain, salt, KEY_LEN);
  return timingSafeEqual(check, expected);
}
