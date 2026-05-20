import { NextResponse } from "next/server";
import { clearStudentSessionCookie } from "@/lib/session";

/** 清除學生登入 Cookie（供學生端導覽列登出） */
export async function POST() {
  await clearStudentSessionCookie();
  return NextResponse.json({ ok: true });
}
