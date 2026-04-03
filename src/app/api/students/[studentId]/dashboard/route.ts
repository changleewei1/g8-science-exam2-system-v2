import { NextResponse } from "next/server";
import { getStudentDashboardUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

type Params = { studentId: string };

export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { studentId } = await ctx.params;
  if (studentId !== session.studentId) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const url = new URL(req.url);
  const scopeId = url.searchParams.get("scopeId");
  if (!scopeId) {
    return NextResponse.json({ error: "MISSING_SCOPE_ID" }, { status: 400 });
  }
  const uc = getStudentDashboardUseCase();
  const data = await uc.execute(studentId, scopeId);
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({
    scope: {
      id: data.scope.id,
      title: data.scope.title,
      subject: data.scope.subject,
    },
    units: data.units.map((u) => ({
      id: u.id,
      unitCode: u.unitCode,
      unitTitle: u.unitTitle,
      sortOrder: u.sortOrder,
    })),
    videoCompletionRate: data.videoCompletion,
    quizPassRate: data.quizPass,
    skillAccuracies: data.skills,
  });
}
