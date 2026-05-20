import { NextResponse } from "next/server";

import { buildStudentDashboardSummary } from "@/lib/student-dashboard-summary";
import { getStudentSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scopeId = url.searchParams.get("scopeId")?.trim();
  if (!scopeId) {
    return NextResponse.json({ error: "MISSING_SCOPE_ID", message: "請提供 scopeId" }, { status: 400 });
  }

  try {
    const data = await buildStudentDashboardSummary(session.studentId, scopeId);
    if (!data) {
      return NextResponse.json({ error: "NOT_FOUND", message: "找不到段考範圍或尚未開放" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "DASHBOARD_SUMMARY_FAILED", message }, { status: 500 });
  }
}
