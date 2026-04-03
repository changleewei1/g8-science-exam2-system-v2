import { NextResponse } from "next/server";
import { getAdminDashboardService } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const url = new URL(req.url);
  const examScopeId = url.searchParams.get("examScopeId");
  if (!examScopeId) {
    return NextResponse.json({ error: "MISSING_EXAM_SCOPE_ID" }, { status: 400 });
  }
  const svc = getAdminDashboardService();
  const students = await svc.getOverview(examScopeId);
  const videos = await svc.getVideoWatchStats(examScopeId);
  return NextResponse.json({ students, videos });
}
