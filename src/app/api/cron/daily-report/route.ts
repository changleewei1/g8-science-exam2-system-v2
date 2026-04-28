import { NextResponse } from "next/server";

import { DailyLearningDigestService } from "@/domain/services/daily-learning-digest-service";
import { getEnv } from "@/lib/env";
import { sendEmailViaResend } from "@/lib/email/send-email";

export const runtime = "nodejs";

function requireEnvList(names: string[]): { ok: true } | { ok: false; missing: string[] } {
  const missing = names.filter((name) => !getEnv(name));
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}

function isAuthorized(req: Request): boolean {
  const cronSecret = getEnv("CRON_SECRET");
  if (!cronSecret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

async function runDailyReport() {
  const digestSvc = new DailyLearningDigestService();
  const digest = await digestSvc.build();

  const resendApiKey = getEnv("RESEND_API_KEY") as string;
  const adminEmail = getEnv("ADMIN_NOTIFY_EMAIL") as string;
  const emailFrom = getEnv("EMAIL_FROM") as string;

  const emailResult = await sendEmailViaResend({
    apiKey: resendApiKey,
    from: emailFrom,
    to: adminEmail,
    subject: digest.subject,
    html: digest.html,
  });

  return {
    ok: true,
    emailId: emailResult.id ?? null,
    totals: digest.totals,
    warnings: digest.warnings,
  };
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNAUTHORIZED",
        message: "授權失敗，請確認 Authorization: Bearer <CRON_SECRET>。",
      },
      { status: 401 },
    );
  }

  const envCheck = requireEnvList([
    "CRON_SECRET",
    "RESEND_API_KEY",
    "ADMIN_NOTIFY_EMAIL",
    "EMAIL_FROM",
  ]);
  if (!envCheck.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "MISSING_ENV",
        message: `系統設定未完成，缺少環境變數：${envCheck.missing.join(", ")}`,
      },
      { status: 500 },
    );
  }

  try {
    const result = await runDailyReport();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知錯誤";
    return NextResponse.json(
      {
        ok: false,
        error: "DAILY_REPORT_FAILED",
        message,
      },
      { status: 500 },
    );
  }
}
