import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { executeParentReportJob } from "@/lib/line/parent-report-background";
import type { ParentReportJobPayload } from "@/lib/line/parent-report-job-types";

export const runtime = "nodejs";

function isPayloadShape(x: unknown): x is ParentReportJobPayload {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (o.kind !== "learning_overview" && o.kind !== "subject_query") {
    return false;
  }
  if (typeof o.lineUserId !== "string" || typeof o.studentId !== "string") {
    return false;
  }
  if (o.kind === "learning_overview") {
    return typeof o.multiBinding === "boolean";
  }
  const pa = o.pendingAction;
  const okPa =
    pa === "homework_status" ||
    pa === "learning_performance" ||
    pa === "video_recommendation";
  const sc = o.subjectCode;
  const okSc = sc === "science" || sc === "math" || sc === "english";
  return okPa && okSc;
}

export async function POST(req: Request) {
  const secret = getEnv("LINE_PROCESS_PARENT_REPORT_SECRET");
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  if (!isPayloadShape(body)) {
    return NextResponse.json({ error: "BAD_REQUEST" }, { status: 400 });
  }

  await executeParentReportJob(body);
  return NextResponse.json({ ok: true });
}
