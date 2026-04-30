import { sendEmailViaResend } from "@/lib/email/send-email";

export async function sendDailyReportEmail(input: {
  resendApiKey: string;
  from: string;
  to: string;
  subject: string;
  content: string;
}): Promise<{ id?: string }> {
  const html = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; white-space: pre-line;">
${input.content}
</div>
`;
  return await sendEmailViaResend({
    apiKey: input.resendApiKey,
    from: input.from,
    to: input.to,
    subject: input.subject,
    html,
  });
}
