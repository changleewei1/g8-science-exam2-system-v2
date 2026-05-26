import { sendEmailViaResend } from "@/lib/email/send-email";
import { getEnv } from "@/lib/env";
import type { ParentDailyEmailReportData } from "@/lib/report/buildParentDailyEmailReport";
import type { TeacherDailyEmailReportData } from "@/lib/report/buildTeacherDailyEmailReport";
import { renderParentDailyEmailHtml } from "@/lib/report/renderParentDailyEmailHtml";
import { renderTeacherDailyEmailHtml } from "@/lib/report/renderTeacherDailyEmailHtml";

/** Resend 寄信所需（不含 CRON_SECRET／ADMIN 收件，由呼叫端另查）。 */
export function listMissingTransactionalEmailEnv(): string[] {
  return ["RESEND_API_KEY", "EMAIL_FROM"].filter((n) => !getEnv(n));
}

export function wrapEmailBody(innerHtml: string): string {
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="utf-8" /></head><body style="margin:0;background:#f1f5f9">${innerHtml}</body></html>`;
}

export async function sendTeacherDailyReportEmail(input: {
  resendApiKey: string;
  from: string;
  to: string;
  subject: string;
  report: TeacherDailyEmailReportData;
}): Promise<{ id?: string }> {
  const html = wrapEmailBody(renderTeacherDailyEmailHtml(input.report));
  return sendEmailViaResend({
    apiKey: input.resendApiKey,
    from: input.from,
    to: input.to,
    subject: input.subject,
    html,
  });
}

export async function sendParentDailyReportEmail(input: {
  resendApiKey: string;
  from: string;
  to: string;
  subject: string;
  report: ParentDailyEmailReportData;
}): Promise<{ id?: string }> {
  const html = wrapEmailBody(renderParentDailyEmailHtml(input.report));
  return sendEmailViaResend({
    apiKey: input.resendApiKey,
    from: input.from,
    to: input.to,
    subject: input.subject,
    html,
  });
}
