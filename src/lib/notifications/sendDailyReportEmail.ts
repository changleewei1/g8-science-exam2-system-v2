import { sendEmailViaResend } from "@/lib/email/send-email";

export async function sendDailyReportEmail(input: {
  resendApiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
}): Promise<{ id?: string }> {
  return await sendEmailViaResend({
    apiKey: input.resendApiKey,
    from: input.from,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
}
