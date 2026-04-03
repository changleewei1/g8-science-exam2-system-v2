import { NextResponse } from "next/server";
import { getStudentLearningTasksUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const uc = getStudentLearningTasksUseCase();
  const tasks = await uc.execute(session.studentId);
  return NextResponse.json({ tasks });
}
