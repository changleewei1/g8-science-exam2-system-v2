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

  if (admin.allowedClasses?.length) {
    if (classId === "all") {
      return NextResponse.json(
        { error: "CLASS_REQUIRED", message: "已啟用班級限制，請指定班級代碼。" },
        { status: 400 },
      );
    }
    if (!admin.allowedClasses.includes(classId)) {
      return NextResponse.json({ error: "FORBIDDEN_CLASS" }, { status: 403 });
    }
  }

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
