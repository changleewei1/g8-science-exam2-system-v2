import { NextResponse } from "next/server";
import { getExamScopeUseCase } from "@/infrastructure/composition";

type Params = { scopeId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { scopeId } = await ctx.params;
  const uc = getExamScopeUseCase();
  const data = await uc.execute(scopeId);
  if (!data) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({
    scope: {
      id: data.scope.id,
      subject: data.scope.subject,
      grade: data.scope.grade,
      term: data.scope.term,
      examNo: data.scope.examNo,
      title: data.scope.title,
      description: data.scope.description,
      isActive: data.scope.isActive,
    },
    units: data.units.map((u) => ({
      id: u.id,
      examScopeId: u.examScopeId,
      unitCode: u.unitCode,
      unitTitle: u.unitTitle,
      sortOrder: u.sortOrder,
    })),
  });
}
