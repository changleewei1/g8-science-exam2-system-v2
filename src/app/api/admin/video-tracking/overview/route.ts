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

  const classId = url.searchParams.get("classId") ?? "all";
  const keyword = url.searchParams.get("keyword") ?? "";

  const options = {
    classId,
    keyword: keyword.trim() || undefined,
  };

  const svc = getAdminDashboardService();
  const students = await svc.getOverview(examScopeId, options);
  const videos = await svc.getVideoWatchStats(examScopeId, options);
  const summary = svc.computeSummary(students);

  return NextResponse.json({
    students,
    videos,
    summary,
    filters: {
      academicYear: url.searchParams.get("academicYear"),
      grade: url.searchParams.get("grade"),
      subject: url.searchParams.get("subject"),
      exam: url.searchParams.get("exam"),
      classId,
      keyword,
      examScopeId,
    },
  });
}
