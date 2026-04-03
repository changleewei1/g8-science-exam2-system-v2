import { NextResponse } from "next/server";
import { getAdminStudentReportUseCase } from "@/infrastructure/composition";
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
  const taskId = url.searchParams.get("taskId");

  const uc = getAdminStudentReportUseCase();
  const report = await uc.execute({
    studentId,
    examScopeId: examScopeId || undefined,
    taskId: taskId || undefined,
  });
  if (!report) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(report);
}
