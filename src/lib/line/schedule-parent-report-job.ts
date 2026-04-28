import { getEnv } from "@/lib/env";
import { executeParentReportJob } from "@/lib/line/parent-report-background";
import type { ParentReportJobPayload } from "@/lib/line/parent-report-job-types";

/**
 * 將家長報告產生工作交給內部 HTTP API（適合 Vercel serverless，避免依賴同一 invocation 續跑）。
 *
 * 若未設定 LINE_PROCESS_PARENT_REPORT_SECRET，改於同程序內執行（僅建議本機開發）。
 *
 * 方式 A（不建議正式環境）：可在 webhook 內 `void executeParentReportJob(payload)` 不 await，
 * 但 serverless 可能在函式回傳後凍結，報告可能送不出。
 */
export function scheduleParentReportJob(
  req: Request,
  payload: ParentReportJobPayload,
): void {
  const secret = getEnv("LINE_PROCESS_PARENT_REPORT_SECRET");
  const runInline = () =>
    void executeParentReportJob(payload).catch((e) => {
      console.error("[scheduleParentReportJob] inline execute failed", e);
    });

  if (!secret) {
    console.warn(
      "[line] LINE_PROCESS_PARENT_REPORT_SECRET 未設定，改於同程序內執行家長報告 job（正式環境請設定並改為內部 API）",
    );
    runInline();
    return;
  }

  let origin: string;
  try {
    origin = new URL(req.url).origin;
  } catch {
    console.error("[scheduleParentReportJob] invalid req.url, fallback inline");
    runInline();
    return;
  }

  void fetch(`${origin}/api/line/process-parent-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(payload),
  })
    .then(async (res) => {
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`process-parent-report ${res.status}: ${t}`);
      }
    })
    .catch((e) => {
      console.error("[scheduleParentReportJob] fetch failed, fallback inline", e);
      runInline();
    });
}
