import { getEnv } from "@/lib/env";
import { publicReportPageUrlFromEnv } from "@/lib/public-url";
import { buildParentReportFlex } from "@/lib/line/build-parent-report-flex";
import {
  MSG_MULTI_STUDENT_HINT,
  MSG_PARENT_REPORT_JOB_FAILED,
} from "@/lib/line/parent-line-messages";
import { logLineMessage } from "@/lib/line/log-line-message";
import { pushLineMessages } from "@/lib/line/push-message";
import type { LineMessage } from "@/lib/line/reply-message";
import { resolveExamScopeIdForSubjectCode } from "@/lib/line/resolve-exam-scope-for-subject";
import { MSG_SUBJECT_NOT_SUPPORTED } from "@/lib/line/resolve-parent-action";
import { buildHomeworkStatusPayload, formatHomeworkStatusText } from "@/lib/line/adapters/build-homework-status-data";
import { buildLearningPerformancePayload } from "@/lib/line/adapters/build-learning-performance-data";
import { buildVideoRecommendationPayload } from "@/lib/line/adapters/build-video-recommendation-data";
import { buildLearningPerformanceFlex } from "@/lib/line/flex/build-learning-performance-flex";
import { buildVideoRecommendationFlex } from "@/lib/line/flex/build-video-recommendation-flex";
import { clearLineUserContext } from "@/lib/line-user-context/line-user-context-service";
import type { SubjectCode } from "@/lib/line-user-context/parse-subject-input";
import {
  getCreateStudentReportLinkUseCase,
  getStudentReportService,
} from "@/infrastructure/composition";

import type { ParentReportJobPayload } from "@/lib/line/parent-report-job-types";

function subjectCodeToLabel(code: SubjectCode): string {
  if (code === "science") return "理化";
  if (code === "math") return "數學";
  return "英文";
}

async function logPushOk(lineUserId: string, preview: string) {
  await logLineMessage({
    lineUserId,
    direction: "outbound",
    messageType: "push",
    textPreview: preview.slice(0, 500),
    lineMessageId: null,
    replyToken: null,
    status: "ok",
    errorMessage: null,
  });
}

async function logPushError(lineUserId: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err);
  await logLineMessage({
    lineUserId,
    direction: "outbound",
    messageType: "push",
    textPreview: MSG_PARENT_REPORT_JOB_FAILED.slice(0, 500),
    lineMessageId: null,
    replyToken: null,
    status: "error",
    errorMessage: msg.slice(0, 2000),
  });
}

async function runLearningOverviewJob(payload: Extract<
  ParentReportJobPayload,
  { kind: "learning_overview" }
>): Promise<void> {
  const { lineUserId, studentId, multiBinding } = payload;
  const reportSvc = getStudentReportService();
  const dto = await reportSvc.buildReport({
    studentId,
    audience: "parent",
  });

  if (!dto) {
    await pushLineMessages(lineUserId, [
      { type: "text", text: "暫時無法產生報告，請稍後再試。" },
    ]);
    await logPushOk(lineUserId, "（無報告）");
    return;
  }

  const linkUc = getCreateStudentReportLinkUseCase();
  const { token } = await linkUc.execute({ studentId });
  let fullReportUrl: string;
  try {
    fullReportUrl = publicReportPageUrlFromEnv(token);
  } catch {
    const base =
      getEnv("APP_BASE_URL")?.replace(/\/$/, "") ||
      getEnv("NEXT_PUBLIC_APP_URL")?.replace(/\/$/, "") ||
      "http://localhost:3000";
    fullReportUrl = `${base}/report?t=${encodeURIComponent(token)}`;
  }

  const flex = buildParentReportFlex({ dto, fullReportUrl });
  const messages: LineMessage[] = multiBinding
    ? ([{ type: "text", text: MSG_MULTI_STUDENT_HINT }, flex] as LineMessage[])
    : ([flex] as LineMessage[]);

  await pushLineMessages(lineUserId, messages);
  await logPushOk(
    lineUserId,
    multiBinding ? `${MSG_MULTI_STUDENT_HINT} [flex]` : "[flex]",
  );
}

async function runSubjectQueryJob(payload: Extract<
  ParentReportJobPayload,
  { kind: "subject_query" }
>): Promise<void> {
  const { lineUserId, studentId, subjectCode, pendingAction } = payload;

  if (subjectCode === "math" || subjectCode === "english") {
    await pushLineMessages(lineUserId, [
      { type: "text", text: MSG_SUBJECT_NOT_SUPPORTED },
    ]);
    await logPushOk(lineUserId, MSG_SUBJECT_NOT_SUPPORTED);
    await clearLineUserContext(lineUserId);
    return;
  }

  const examScopeId = await resolveExamScopeIdForSubjectCode("science");
  const reportSvc = getStudentReportService();
  const dto = await reportSvc.buildReport({
    studentId,
    examScopeId,
    audience: "parent",
  });

  if (!dto) {
    await pushLineMessages(lineUserId, [
      { type: "text", text: "暫時無法產生報告，請稍後再試。" },
    ]);
    await logPushOk(lineUserId, "（無報告）");
    await clearLineUserContext(lineUserId);
    return;
  }

  const label = subjectCodeToLabel(subjectCode);
  let messages: LineMessage[] = [];

  if (pendingAction === "homework_status") {
    const p = buildHomeworkStatusPayload(dto, label);
    messages = [{ type: "text", text: formatHomeworkStatusText(p) }];
  } else if (pendingAction === "learning_performance") {
    const p = buildLearningPerformancePayload(dto, label);
    messages = [buildLearningPerformanceFlex(p)];
  } else {
    const p = buildVideoRecommendationPayload(dto, label);
    if (p.suggestedVideos.length === 0) {
      await pushLineMessages(lineUserId, [
        {
          type: "text",
          text: "目前暫無推薦影片，請稍後再試或聯絡老師",
        },
      ]);
      await logPushOk(lineUserId, "（無推薦影片）");
      await clearLineUserContext(lineUserId);
      return;
    }
    messages = [buildVideoRecommendationFlex(p)];
  }

  await pushLineMessages(lineUserId, messages);
  await logPushOk(lineUserId, `[${pendingAction}]`);
  await clearLineUserContext(lineUserId);
}

/**
 * 產生家長學習報告並以 push 送出（供 /api/line/process-parent-report 或本機 fallback 呼叫）。
 */
export async function executeParentReportJob(
  payload: ParentReportJobPayload,
): Promise<void> {
  try {
    if (payload.kind === "learning_overview") {
      await runLearningOverviewJob(payload);
    } else {
      await runSubjectQueryJob(payload);
    }
  } catch (err) {
    console.error("[executeParentReportJob]", err);
    try {
      await pushLineMessages(payload.lineUserId, [
        { type: "text", text: MSG_PARENT_REPORT_JOB_FAILED },
      ]);
    } catch (pushErr) {
      console.error("[executeParentReportJob] error push failed", pushErr);
    }
    await logPushError(payload.lineUserId, err);
  }
}
