import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import { getStudentSkillPracticeDetailForAdmin } from "@/lib/skill-practice-summary";

type RouteContext = { params: Promise<{ studentId: string }> };

export async function GET(req: Request, ctx: RouteContext) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scopeId = url.searchParams.get("scopeId");
  if (!scopeId) {
    return NextResponse.json({ error: "MISSING_SCOPE_ID" }, { status: 400 });
  }

  const { studentId } = await ctx.params;
  if (!studentId) {
    return NextResponse.json({ error: "MISSING_STUDENT_ID" }, { status: 400 });
  }

  try {
    const data = await getStudentSkillPracticeDetailForAdmin(studentId, scopeId);
    if (!data) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "SKILL_PRACTICE_DETAIL_FAILED", detail: msg }, { status: 500 });
  }
}
