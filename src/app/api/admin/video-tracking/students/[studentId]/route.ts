import { NextResponse } from "next/server";
import { getAdminDashboardService } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";

type Params = { studentId: string };

export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { studentId } = await ctx.params;
  const url = new URL(req.url);
  const examScopeId = url.searchParams.get("examScopeId");
  if (!examScopeId) {
    return NextResponse.json({ error: "MISSING_EXAM_SCOPE_ID" }, { status: 400 });
  }
  const svc = getAdminDashboardService();
  const detail = await svc.getStudentDetail(studentId, examScopeId);
  if (!detail) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
