import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { buildParentDailyEmailReport } from "@/lib/report/buildParentDailyEmailReport";
import { sendParentDailyReportEmail } from "@/lib/report/sendDailyReportEmail";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

/** query / body 顯式布林；無法辨識時回 null。 */
function parseExplicitBool(raw: unknown): boolean | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  return null;
}

/**
 * 是否改寄 ADMIN_NOTIFY_EMAIL（避免測試信打擾真家長）。
 * - 未指定時：非 production 預設 true；production 預設 false。
 * - 優先順序：URL query `redirectToAdmin` → body.redirectToAdmin。
 */
function resolveRedirectToAdmin(req: Request, body: unknown): boolean {
  const url = new URL(req.url);
  const fromQuery = parseExplicitBool(url.searchParams.get("redirectToAdmin"));
  if (fromQuery !== null) return fromQuery;

  if (typeof body === "object" && body !== null && "redirectToAdmin" in body) {
    const fromBody = parseExplicitBool((body as { redirectToAdmin: unknown }).redirectToAdmin);
    if (fromBody !== null) return fromBody;
  }

  return process.env.NODE_ENV !== "production";
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const studentId =
    typeof body === "object" && body !== null && "studentId" in body
      ? String((body as { studentId: unknown }).studentId).trim()
      : "";
  if (!studentId) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", message: "請提供 body.studentId（UUID）。" },
      { status: 400 },
    );
  }

  const redirectToAdmin = resolveRedirectToAdmin(req, body);

  const missingResend = ["RESEND_API_KEY", "EMAIL_FROM"].filter((k) => !getEnv(k));
  if (missingResend.length > 0) {
    return NextResponse.json(
      { ok: false, error: "MISSING_ENV", message: `缺少環境變數：${missingResend.join(", ")}` },
      { status: 500 },
    );
  }

  if (redirectToAdmin && !getEnv("ADMIN_NOTIFY_EMAIL")) {
    return NextResponse.json(
      {
        ok: false,
        error: "MISSING_ENV",
        message: "改寄管理員信箱時需要環境變數：ADMIN_NOTIFY_EMAIL",
      },
      { status: 500 },
    );
  }

  const built = await buildParentDailyEmailReport(studentId);
  if (!built.ok) {
    const status = built.reason === "NO_PARENT_EMAIL" ? 400 : 404;
    return NextResponse.json(
      { ok: false, error: built.reason, message: built.message },
      { status },
    );
  }

  const parentMailbox = built.data.toEmail;
  const toAddress = redirectToAdmin ? (getEnv("ADMIN_NOTIFY_EMAIL") as string) : parentMailbox;
  const subjectPrefix = redirectToAdmin ? `[測試·轉寄管理員] ` : `[測試] `;

  try {
    const sent = await sendParentDailyReportEmail({
      resendApiKey: getEnv("RESEND_API_KEY")!,
      from: getEnv("EMAIL_FROM")!,
      to: toAddress,
      subject: `${subjectPrefix}${built.data.subject}`,
      report: built.data,
    });
    return NextResponse.json({
      ok: true,
      to: toAddress,
      redirectToAdmin,
      parentEmailOnFile: redirectToAdmin ? parentMailbox : undefined,
      studentId,
      emailId: sent.id ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "SEND_FAILED", message }, { status: 500 });
  }
}
