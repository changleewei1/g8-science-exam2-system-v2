import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { sendDailyReportEmail } from "@/lib/notifications/sendDailyReportEmail";
import { buildDailyOverviewReport } from "@/lib/report/buildDailyOverviewReport";
import { buildTaskTrackingReport } from "@/lib/report/buildTaskTrackingReport";

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
  const resendApiKey = getEnv("RESEND_API_KEY") as string;
  const adminEmail = getEnv("ADMIN_NOTIFY_EMAIL") as string;
  const emailFrom = getEnv("EMAIL_FROM") as string;

  const warnings: string[] = [];

  let dailyHtml = "";
  let dailyContent = "";
  let dailyWarnings: string[] = [];
  let dailyTitle = "【國二理化】每日學習分析總覽";
  try {
    const daily = await buildDailyOverviewReport();
    dailyTitle = daily.title;
    dailyHtml = daily.html;
    dailyContent = daily.content;
    dailyWarnings = daily.warnings;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(`每日總覽產生失敗：${msg}`);
  }

  let taskHtml = "";
  let taskWarnings: string[] = [];
  let taskCount = 0;
  try {
    const task = await buildTaskTrackingReport();
    taskHtml = task.html;
    taskWarnings = task.warnings;
    taskCount = task.tasks.length;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    warnings.push(`任務追蹤產生失敗：${msg}`);
  }

  warnings.push(...dailyWarnings, ...taskWarnings);

  const warningHtml = warnings.length
    ? `<div style="margin-top:12px;color:#9a3412"><strong>系統提醒：</strong><ul>${warnings
        .map((w) => `<li>${w.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</li>`)
        .join("")}</ul></div>`
    : "";

  const content = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
      ${dailyHtml || dailyContent || "今日無法產生每日總覽。"}
      ${taskHtml ? `<hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0" />${taskHtml}` : ""}
      ${taskHtml ? "" : "<p style=\"margin-top:18px;color:#334155\">今日沒有符合條件（7 天內）的任務追蹤推播。</p>"}
      ${warningHtml}
    </div>
  `;

  const subject = taskCount > 0 ? `${dailyTitle}（含任務追蹤 ${taskCount} 筆）` : dailyTitle;

  const emailResult = await sendDailyReportEmail({
    resendApiKey,
    from: emailFrom,
    to: adminEmail,
    subject,
    content,
  });

  return {
    ok: true,
    emailId: emailResult.id ?? null,
    totals: {
      taskCount,
    },
    warnings,
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
