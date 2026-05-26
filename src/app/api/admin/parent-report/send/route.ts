import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { buildParentDailyEmailReport } from "@/lib/report/buildParentDailyEmailReport";
import { sendParentDailyReportEmail } from "@/lib/report/sendDailyReportEmail";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const studentId = typeof b.studentId === "string" ? b.studentId.trim() : "";
  const scopeId =
    typeof b.scopeId === "string"
      ? b.scopeId.trim()
      : typeof b.examScopeId === "string"
        ? b.examScopeId.trim()
        : "";
  const teacherMessage =
    typeof b.teacherMessage === "string"
      ? b.teacherMessage
      : typeof b.teacher_message === "string"
        ? b.teacher_message
        : "";

  if (!studentId || !scopeId) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", message: "請提供 studentId 與 scopeId。" },
      { status: 400 },
    );
  }

  const missing = ["RESEND_API_KEY", "EMAIL_FROM"].filter((k) => !getEnv(k));
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "MISSING_ENV", message: `缺少環境變數：${missing.join(", ")}` },
      { status: 500 },
    );
  }

  const built = await buildParentDailyEmailReport(studentId, undefined, {
    examScopeId: scopeId,
    teacherMessage: teacherMessage.trim() || null,
  });

  if (!built.ok) {
    const status = built.reason === "NO_STUDENT" || built.reason === "INACTIVE" ? 404 : 400;
    return NextResponse.json({ ok: false, error: built.reason, message: built.message }, { status });
  }

  const realEmail = (built.data.toEmail ?? "").trim();
  if (!realEmail || realEmail === "(尚未設定家長信箱)") {
    return NextResponse.json(
      { ok: false, error: "NO_PARENT_EMAIL", message: "此學生尚未設定 parent_email，無法寄送。" },
      { status: 400 },
    );
  }

  try {
    const sent = await sendParentDailyReportEmail({
      resendApiKey: getEnv("RESEND_API_KEY")!,
      from: getEnv("EMAIL_FROM")!,
      to: realEmail,
      subject: built.data.subject,
      report: built.data,
    });
    return NextResponse.json({
      ok: true,
      to: realEmail,
      emailId: sent.id ?? null,
      studentId,
      scopeId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "SEND_FAILED", message }, { status: 500 });
  }
}
