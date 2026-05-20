import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { buildTeacherDailyEmailReport } from "@/lib/report/buildTeacherDailyEmailReport";
import { sendTeacherDailyReportEmail } from "@/lib/report/sendDailyReportEmail";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const missing = ["RESEND_API_KEY", "EMAIL_FROM", "ADMIN_NOTIFY_EMAIL"].filter((k) => !getEnv(k));
  if (missing.length > 0) {
    return NextResponse.json(
      { ok: false, error: "MISSING_ENV", message: `缺少環境變數：${missing.join(", ")}` },
      { status: 500 },
    );
  }

  try {
    const report = await buildTeacherDailyEmailReport();
    const subject = `[測試] ${report.mailTitle}`;
    const sent = await sendTeacherDailyReportEmail({
      resendApiKey: getEnv("RESEND_API_KEY")!,
      from: getEnv("EMAIL_FROM")!,
      to: getEnv("ADMIN_NOTIFY_EMAIL")!,
      subject,
      report,
    });
    return NextResponse.json({
      ok: true,
      to: getEnv("ADMIN_NOTIFY_EMAIL"),
      emailId: sent.id ?? null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "SEND_FAILED", message }, { status: 500 });
  }
}
