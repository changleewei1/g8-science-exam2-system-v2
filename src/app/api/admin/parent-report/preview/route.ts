import { NextResponse } from "next/server";

import { buildParentDailyEmailReport } from "@/lib/report/buildParentDailyEmailReport";
import { renderParentDailyEmailHtml } from "@/lib/report/renderParentDailyEmailHtml";
import { wrapEmailBody } from "@/lib/report/sendDailyReportEmail";
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
  if (!studentId || !scopeId) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", message: "請提供 studentId 與 scopeId（examScopeId）。" },
      { status: 400 },
    );
  }

  const teacherMessage =
    typeof b.teacherMessage === "string" ? b.teacherMessage : typeof b.teacher_message === "string" ? b.teacher_message : "";

  const built = await buildParentDailyEmailReport(studentId, undefined, {
    examScopeId: scopeId,
    teacherMessage: teacherMessage.trim() || null,
    previewBypassMissingParentEmail: true,
  });

  if (!built.ok) {
    const status = built.reason === "NO_STUDENT" || built.reason === "INACTIVE" ? 404 : 400;
    return NextResponse.json({ ok: false, error: built.reason, message: built.message }, { status });
  }

  const html = wrapEmailBody(renderParentDailyEmailHtml(built.data));
  return NextResponse.json({
    ok: true,
    html,
    previewMeta: {
      toEmail: built.data.toEmail,
      studentName: built.data.studentName,
      subject: built.data.subject,
    },
  });
}
