import { bindParentLineSubscriber } from "@/lib/line/parent-binding-service";
import { MSG_PARENT_REPORT_PROCESSING } from "@/lib/line/parent-line-messages";
import {
  getParentStudentByLineUser,
  listBoundStudentsForLineUser,
} from "@/lib/line/get-parent-student-by-line-user";
import { logLineMessage } from "@/lib/line/log-line-message";
import {
  normalizedClassKeyFromBinding,
  parseParentBindingText,
  type ParseParentBindingOk,
} from "@/lib/line/parse-parent-binding";
import { normalizeStudentNameForMatch } from "@/lib/line/parent-binding-service";
import { replyLineMessages, type LineMessage } from "@/lib/line/reply-message";
import { scheduleParentReportJob } from "@/lib/line/schedule-parent-report-job";
import { resolveExamScopeIdForSubjectCode } from "@/lib/line/resolve-exam-scope-for-subject";
import {
  matchTextEntryToAction,
  MSG_ASK_SUBJECT,
  MSG_CONTEXT_EXPIRED,
  MSG_MULTI_STUDENT_NEED_PAIR,
  MSG_NEED_SELECT_FEATURE_FIRST,
  MSG_STUDENT_AMBIGUOUS,
  MSG_STUDENT_NOT_IN_BINDINGS,
  MSG_SUBJECT_NOT_SUPPORTED,
  MSG_SUBJECT_UNRECOGNIZED,
  MSG_UNBOUND_FOR_FEATURE,
  parsePostbackToPendingAction,
} from "@/lib/line/resolve-parent-action";
import { buildHomeworkStatusPayload, formatHomeworkStatusText } from "@/lib/line/adapters/build-homework-status-data";
import { buildLearningPerformancePayload } from "@/lib/line/adapters/build-learning-performance-data";
import { buildVideoRecommendationPayload } from "@/lib/line/adapters/build-video-recommendation-data";
import { buildLearningPerformanceFlex } from "@/lib/line/flex/build-learning-performance-flex";
import { buildVideoRecommendationFlex } from "@/lib/line/flex/build-video-recommendation-flex";
import {
  clearLineUserContext,
  getLineUserContext,
  isLineUserContextExpired,
  setLineUserContext,
} from "@/lib/line-user-context/line-user-context-service";
import {
  isSubjectOnlyLine,
  matchesParentLearningOverviewQuery,
  parseSubjectStepInput,
  normalizeLineInput,
  type SubjectCode,
} from "@/lib/line-user-context/parse-subject-input";
import { getStudentReportService } from "@/infrastructure/composition";

const MSG_DUPLICATE_STUDENT = "資料重複，請聯絡老師";
const MSG_BIND_FORMAT =
  "請依格式輸入，例如：我是702王小明的爸爸 或 我是702王小明的媽媽";
const MSG_BIND_OK =
  "綁定成功，之後可輸入「小朋友學習狀況」查詢，或使用下方查詢功能。";
const MSG_ALREADY_BOUND = "您已綁定此學生。";
const MSG_NOT_FOUND = "找不到學生資料，請確認班級與姓名。";
const MSG_PARENT_LIMIT = "該學生已綁定兩位家長，請聯絡老師。";
const MSG_NOT_LINKED = "尚未綁定學生，請先完成綁定。";
export type LineTextPipelineResult = { handled: true } | { handled: false };

function subjectCodeToLabel(code: SubjectCode): string {
  if (code === "science") return "理化";
  if (code === "math") return "數學";
  return "英文";
}

async function logOutboundOk(
  lineUserId: string,
  replyToken: string,
  preview: string,
) {
  await logLineMessage({
    lineUserId,
    direction: "outbound",
    messageType: "reply",
    textPreview: preview.slice(0, 500),
    lineMessageId: null,
    replyToken,
    status: "ok",
    errorMessage: null,
  });
}

async function handleBinding(
  lineUserId: string,
  replyToken: string,
  parsed: ParseParentBindingOk,
) {
  const normalizedClassKey = normalizedClassKeyFromBinding(parsed);
  const studentNameNormalized = normalizeStudentNameForMatch(parsed.studentName);

  const outcome = await bindParentLineSubscriber({
    lineUserId,
    normalizedClassKey,
    studentNameNormalized,
    role: parsed.role,
  });

  let reply: string;
  switch (outcome.status) {
    case "bound":
      reply = MSG_BIND_OK;
      break;
    case "already_bound":
      reply = MSG_ALREADY_BOUND;
      break;
    case "not_found":
      reply = MSG_NOT_FOUND;
      break;
    case "duplicate":
      reply = MSG_DUPLICATE_STUDENT;
      break;
    case "parent_limit":
      reply = MSG_PARENT_LIMIT;
      break;
    case "error":
      throw new Error(outcome.message);
  }

  await replyLineMessages(replyToken, [{ type: "text", text: reply }]);
  await logOutboundOk(lineUserId, replyToken, reply);
}

async function handleLearningQuery(
  req: Request,
  lineUserId: string,
  replyToken: string,
) {
  const ctx = await getParentStudentByLineUser(lineUserId);
  if (ctx.kind === "none") {
    await replyLineMessages(replyToken, [
      { type: "text", text: MSG_NOT_LINKED },
    ]);
    await logOutboundOk(lineUserId, replyToken, MSG_NOT_LINKED);
    return;
  }

  await replyLineMessages(replyToken, [
    { type: "text", text: MSG_PARENT_REPORT_PROCESSING },
  ]);
  await logOutboundOk(lineUserId, replyToken, MSG_PARENT_REPORT_PROCESSING);

  scheduleParentReportJob(req, {
    kind: "learning_overview",
    lineUserId,
    studentId: ctx.studentId,
    multiBinding: ctx.kind === "multiple",
  });
}

function resolveStudentForSubjectStep(
  bindings: Awaited<ReturnType<typeof listBoundStudentsForLineUser>>,
  step: ReturnType<typeof parseSubjectStepInput>,
):
  | { ok: true; studentId: string }
  | { ok: false; message: string; code: "multi_need_pair" | "other" } {
  if (bindings.length === 0) {
    return { ok: false, message: MSG_UNBOUND_FOR_FEATURE, code: "other" };
  }

  if (step.mode === "empty") {
    return { ok: false, message: MSG_SUBJECT_UNRECOGNIZED, code: "other" };
  }

  if (bindings.length === 1) {
    const only = bindings[0];
    if (step.mode === "subject_only") {
      return { ok: true, studentId: only.studentId };
    }
    const want = normalizeStudentNameForMatch(step.studentNameRaw);
    const got = normalizeStudentNameForMatch(only.displayName);
    if (want === got) {
      return { ok: true, studentId: only.studentId };
    }
    return { ok: false, message: MSG_STUDENT_NOT_IN_BINDINGS, code: "other" };
  }

  if (step.mode === "subject_only") {
    return {
      ok: false,
      message: MSG_MULTI_STUDENT_NEED_PAIR,
      code: "multi_need_pair",
    };
  }

  const want = normalizeStudentNameForMatch(step.studentNameRaw);
  const matches = bindings.filter(
    (b) => normalizeStudentNameForMatch(b.displayName) === want,
  );
  if (matches.length === 0) {
    return { ok: false, message: MSG_STUDENT_NOT_IN_BINDINGS, code: "other" };
  }
  if (matches.length > 1) {
    return { ok: false, message: MSG_STUDENT_AMBIGUOUS, code: "other" };
  }
  return { ok: true, studentId: matches[0].studentId };
}

async function runReportQuery(args: {
  lineUserId: string;
  replyToken: string;
  studentId: string;
  subjectCode: SubjectCode;
  pendingAction:
    | "homework_status"
    | "learning_performance"
    | "video_recommendation";
}) {
  const { subjectCode } = args;
  if (subjectCode === "math" || subjectCode === "english") {
    await replyLineMessages(args.replyToken, [
      { type: "text", text: MSG_SUBJECT_NOT_SUPPORTED },
    ]);
    await logOutboundOk(
      args.lineUserId,
      args.replyToken,
      MSG_SUBJECT_NOT_SUPPORTED,
    );
    await clearLineUserContext(args.lineUserId);
    return;
  }

  const examScopeId = await resolveExamScopeIdForSubjectCode("science");
  const reportSvc = getStudentReportService();
  const dto = await reportSvc.buildReport({
    studentId: args.studentId,
    examScopeId,
    audience: "parent",
  });

  if (!dto) {
    await replyLineMessages(args.replyToken, [
      { type: "text", text: "暫時無法產生報告，請稍後再試。" },
    ]);
    await logOutboundOk(args.lineUserId, args.replyToken, "（無報告）");
    await clearLineUserContext(args.lineUserId);
    return;
  }

  const label = subjectCodeToLabel(subjectCode);
  let messages: LineMessage[] = [];

  if (args.pendingAction === "homework_status") {
    const p = buildHomeworkStatusPayload(dto, label);
    messages = [{ type: "text", text: formatHomeworkStatusText(p) }];
  } else if (args.pendingAction === "learning_performance") {
    const p = buildLearningPerformancePayload(dto, label);
    messages = [buildLearningPerformanceFlex(p)];
  } else {
    const p = buildVideoRecommendationPayload(dto, label);
    if (p.suggestedVideos.length === 0) {
      await replyLineMessages(args.replyToken, [
        {
          type: "text",
          text: "目前暫無推薦影片，請稍後再試或聯絡老師",
        },
      ]);
      await logOutboundOk(
        args.lineUserId,
        args.replyToken,
        "（無推薦影片）",
      );
      await clearLineUserContext(args.lineUserId);
      return;
    }
    messages = [buildVideoRecommendationFlex(p)];
  }

  await replyLineMessages(args.replyToken, messages);
  await logOutboundOk(
    args.lineUserId,
    args.replyToken,
    `[${args.pendingAction}]`,
  );
  await clearLineUserContext(args.lineUserId);
}

async function handleSubjectWithContext(args: {
  req: Request;
  lineUserId: string;
  replyToken: string;
  rawText: string;
  pendingAction:
    | "homework_status"
    | "learning_performance"
    | "video_recommendation";
}) {
  const step = parseSubjectStepInput(args.rawText);

  if (step.mode === "empty") {
    await replyLineMessages(args.replyToken, [
      { type: "text", text: MSG_SUBJECT_UNRECOGNIZED },
    ]);
    await logOutboundOk(args.lineUserId, args.replyToken, "empty subject");
    return;
  }

  if (step.resolution.status === "unknown") {
    await replyLineMessages(args.replyToken, [
      { type: "text", text: MSG_SUBJECT_UNRECOGNIZED },
    ]);
    await logOutboundOk(args.lineUserId, args.replyToken, "unknown subject");
    return;
  }

  const subjectCode = step.resolution.code;

  const bindings = await listBoundStudentsForLineUser(args.lineUserId);
  const studentPick = resolveStudentForSubjectStep(bindings, step);

  if (!studentPick.ok) {
    await replyLineMessages(args.replyToken, [
      { type: "text", text: studentPick.message },
    ]);
    await logOutboundOk(args.lineUserId, args.replyToken, studentPick.message);
    if (studentPick.code !== "multi_need_pair") {
      await clearLineUserContext(args.lineUserId);
    }
    return;
  }

  if (subjectCode === "science") {
    await replyLineMessages(args.replyToken, [
      { type: "text", text: MSG_PARENT_REPORT_PROCESSING },
    ]);
    await logOutboundOk(
      args.lineUserId,
      args.replyToken,
      MSG_PARENT_REPORT_PROCESSING,
    );
    scheduleParentReportJob(args.req, {
      kind: "subject_query",
      lineUserId: args.lineUserId,
      studentId: studentPick.studentId,
      subjectCode: "science",
      pendingAction: args.pendingAction,
    });
    return;
  }

  await runReportQuery({
    lineUserId: args.lineUserId,
    replyToken: args.replyToken,
    studentId: studentPick.studentId,
    subjectCode,
    pendingAction: args.pendingAction,
  });
}

/**
 * 文字訊息主流程；回傳是否已消耗（不再顯示預設綁定提示）。
 */
export async function runLineTextPipeline(
  req: Request,
  input: { lineUserId: string; text: string; replyToken: string },
): Promise<LineTextPipelineResult> {
  const raw = input.text;
  const text = normalizeLineInput(raw);

  if (matchesParentLearningOverviewQuery(raw)) {
    await handleLearningQuery(req, input.lineUserId, input.replyToken);
    return { handled: true };
  }

  const bindParsed = parseParentBindingText(raw);
  if (bindParsed.ok) {
    await handleBinding(input.lineUserId, input.replyToken, bindParsed);
    return { handled: true };
  }

  const entryAction = matchTextEntryToAction(text);
  if (entryAction) {
    const bindings = await listBoundStudentsForLineUser(input.lineUserId);
    if (bindings.length === 0) {
      await replyLineMessages(input.replyToken, [
        { type: "text", text: MSG_UNBOUND_FOR_FEATURE },
      ]);
      await logOutboundOk(
        input.lineUserId,
        input.replyToken,
        MSG_UNBOUND_FOR_FEATURE,
      );
      return { handled: true };
    }
    await setLineUserContext({
      lineUserId: input.lineUserId,
      pendingAction: entryAction,
    });
    await replyLineMessages(input.replyToken, [
      { type: "text", text: MSG_ASK_SUBJECT },
    ]);
    await logOutboundOk(input.lineUserId, input.replyToken, MSG_ASK_SUBJECT);
    return { handled: true };
  }

  const ctxRow = await getLineUserContext(input.lineUserId);
  if (ctxRow) {
    if (isLineUserContextExpired(ctxRow)) {
      await clearLineUserContext(input.lineUserId);
      await replyLineMessages(input.replyToken, [
        { type: "text", text: MSG_CONTEXT_EXPIRED },
      ]);
      await logOutboundOk(
        input.lineUserId,
        input.replyToken,
        MSG_CONTEXT_EXPIRED,
      );
      return { handled: true };
    }

    await handleSubjectWithContext({
      req,
      lineUserId: input.lineUserId,
      replyToken: input.replyToken,
      rawText: raw,
      pendingAction: ctxRow.pending_action,
    });
    return { handled: true };
  }

  if (isSubjectOnlyLine(raw)) {
    await replyLineMessages(input.replyToken, [
      { type: "text", text: MSG_NEED_SELECT_FEATURE_FIRST },
    ]);
    await logOutboundOk(
      input.lineUserId,
      input.replyToken,
      MSG_NEED_SELECT_FEATURE_FIRST,
    );
    return { handled: true };
  }

  return { handled: false };
}

export async function runLinePostbackPipeline(input: {
  lineUserId: string;
  replyToken: string;
  data: string | undefined;
}): Promise<void> {
  const action = parsePostbackToPendingAction(input.data);
  if (!action) {
    console.warn("[line postback] unrecognized data", input.data);
    return;
  }

  const bindings = await listBoundStudentsForLineUser(input.lineUserId);
  if (bindings.length === 0) {
    await replyLineMessages(input.replyToken, [
      { type: "text", text: MSG_UNBOUND_FOR_FEATURE },
    ]);
    await logOutboundOk(
      input.lineUserId,
      input.replyToken,
      MSG_UNBOUND_FOR_FEATURE,
    );
    return;
  }

  await setLineUserContext({
    lineUserId: input.lineUserId,
    pendingAction: action,
  });
  await replyLineMessages(input.replyToken, [
    { type: "text", text: MSG_ASK_SUBJECT },
  ]);
  await logOutboundOk(input.lineUserId, input.replyToken, MSG_ASK_SUBJECT);
}
