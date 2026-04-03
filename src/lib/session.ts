import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { requireEnv } from "@/lib/env";

const STUDENT_COOKIE = "g8_science_exam2_student_session";
const ADMIN_COOKIE = "g8_science_exam2_admin_session";

function getSecret(): Uint8Array {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET"));
}

export type StudentSessionPayload = {
  role: "student";
  studentId: string;
};

export type AdminSessionPayload = {
  role: "admin";
};

export async function signStudentSession(studentId: string): Promise<string> {
  return new SignJWT({ role: "student", studentId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function signAdminSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1d")
    .sign(getSecret());
}

export async function verifyStudentToken(token: string): Promise<StudentSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "student" || typeof payload.studentId !== "string") return null;
    return { role: "student", studentId: payload.studentId };
  } catch {
    return null;
  }
}

export async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.role !== "admin") return null;
    return { role: "admin" };
  } catch {
    return null;
  }
}

export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const c = await cookies();
  const t = c.get(STUDENT_COOKIE)?.value;
  if (!t) return null;
  return verifyStudentToken(t);
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const c = await cookies();
  const t = c.get(ADMIN_COOKIE)?.value;
  if (!t) return null;
  return verifyAdminToken(t);
}

export const sessionCookieNames = { student: STUDENT_COOKIE, admin: ADMIN_COOKIE };

/**
 * Production 預設使用 Secure Cookie（需 HTTPS）。
 * 以 `next start` 在區網用 http://192.168.x.x 測試時，瀏覽器會丟棄 Secure Cookie，導致無法登入。
 * 在 .env.local 設定 SESSION_COOKIE_INSECURE=1 可改為非 Secure（僅限可信區網測試）。
 */
function sessionCookieSecure(): boolean {
  if (process.env.SESSION_COOKIE_INSECURE === "1") return false;
  return process.env.NODE_ENV === "production";
}

export async function setStudentSessionCookie(token: string) {
  const c = await cookies();
  c.set(STUDENT_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: sessionCookieSecure(),
  });
}

export async function setAdminSessionCookie(token: string) {
  const c = await cookies();
  c.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
    secure: sessionCookieSecure(),
  });
}

export async function clearStudentSessionCookie() {
  const c = await cookies();
  c.delete(STUDENT_COOKIE);
}

export async function clearAdminSessionCookie() {
  const c = await cookies();
  c.delete(ADMIN_COOKIE);
}
