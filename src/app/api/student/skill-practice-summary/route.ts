import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/session";
import { getStudentSkillPracticeRows } from "@/lib/skill-practice-summary";

export async function GET(req: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scopeId = url.searchParams.get("scopeId");
  if (!scopeId) {
    return NextResponse.json({ error: "MISSING_SCOPE_ID" }, { status: 400 });
  }

  try {
    const data = await getStudentSkillPracticeRows(session.studentId, scopeId);
    if (!data) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "SKILL_PRACTICE_SUMMARY_FAILED", detail: msg }, { status: 500 });
  }
}
