import { NextResponse } from "next/server";
import { getLearningTaskService } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const svc = getLearningTaskService();
  const summary = await svc.getStudentLearningTaskSummary(session.studentId);
  return NextResponse.json(summary);
}
