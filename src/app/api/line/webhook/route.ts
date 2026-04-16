import { getEnv } from "@/lib/env";
import {
  runLinePostbackPipeline,
  runLineTextPipeline,
} from "@/lib/line/parent-query-orchestrator";
import { logLineMessage } from "@/lib/line/log-line-message";
import { replyLineMessages } from "@/lib/line/reply-message";
import {
  shouldVerifyLineWebhook,
  verifyLineSignature,
} from "@/lib/line/verify-signature";

export const runtime = "nodejs";

const MSG_BIND_FORMAT =
  "請依格式輸入，例如：我是702王小明的爸爸 或 我是702王小明的媽媽";

type LineSource = { userId?: string; type: string };

type LineWebhookEvent =
  | {
      type: "message";
      replyToken: string;
      source: LineSource;
      message: { type: string; id?: string; text?: string };
    }
  | {
      type: "postback";
      replyToken: string;
      source: LineSource;
      postback: { data?: string };
    };

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");

  if (shouldVerifyLineWebhook()) {
    const secret = getEnv("LINE_CHANNEL_SECRET");
    if (!secret || !verifyLineSignature(rawBody, signature, secret)) {
      return new Response("Bad Request", { status: 400 });
    }
  }

  let body: { events?: LineWebhookEvent[] };
  try {
    body = JSON.parse(rawBody) as { events?: LineWebhookEvent[] };
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  const events = body.events ?? [];

  for (const ev of events) {
    const lineUserId = ev.source?.userId ?? null;
    const replyToken = ev.replyToken;

    if (ev.type === "message" && ev.message?.type === "text") {
      const text = (ev.message.text ?? "").trim();
      const lineMessageId = ev.message.id ?? null;

      await logLineMessage({
        lineUserId,
        direction: "inbound",
        messageType: "text",
        textPreview: text,
        lineMessageId,
        replyToken,
        status: "ok",
        errorMessage: null,
      });

      if (!lineUserId) {
        await logLineMessage({
          lineUserId: null,
          direction: "outbound",
          messageType: "skipped",
          textPreview: null,
          lineMessageId: null,
          replyToken,
          status: "skipped",
          errorMessage: "missing userId",
        });
        continue;
      }

      try {
        const result = await runLineTextPipeline(req, {
          lineUserId,
          text,
          replyToken,
        });
        if (!result.handled) {
          await replyLineMessages(replyToken, [
            { type: "text", text: MSG_BIND_FORMAT },
          ]);
          await logLineMessage({
            lineUserId,
            direction: "outbound",
            messageType: "reply",
            textPreview: MSG_BIND_FORMAT,
            lineMessageId: null,
            replyToken,
            status: "ok",
            errorMessage: null,
          });
        }
      } catch (e) {
        console.error("[line webhook] text handler error:", e);
        const msg = e instanceof Error ? e.message : String(e);
        await logLineMessage({
          lineUserId,
          direction: "outbound",
          messageType: "text",
          textPreview: null,
          lineMessageId: null,
          replyToken,
          status: "error",
          errorMessage: msg,
        });
        try {
          await replyLineMessages(replyToken, [
            { type: "text", text: "系統暫時無法處理，請稍後再試。" },
          ]);
        } catch (replyErr) {
          console.error(
            "[line webhook] failed to send error reply (check LINE_CHANNEL_ACCESS_TOKEN):",
            replyErr,
          );
        }
      }
      continue;
    }

    if (ev.type === "postback") {
      const data = ev.postback?.data;

      await logLineMessage({
        lineUserId,
        direction: "inbound",
        messageType: "postback",
        textPreview: data ?? "",
        lineMessageId: null,
        replyToken,
        status: "ok",
        errorMessage: null,
      });

      if (!lineUserId) continue;

      try {
        await runLinePostbackPipeline({
          lineUserId,
          replyToken,
          data,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[line postback]", msg);
        await logLineMessage({
          lineUserId,
          direction: "outbound",
          messageType: "postback",
          textPreview: null,
          lineMessageId: null,
          replyToken,
          status: "error",
          errorMessage: msg,
        });
      }
    }
  }

  return new Response("ok", { status: 200 });
}
