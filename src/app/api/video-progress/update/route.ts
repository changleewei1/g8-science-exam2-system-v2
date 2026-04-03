import { NextResponse } from "next/server";
import { getUpdateVideoProgressUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";
import { videoProgressBodySchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const json = await req.json().catch(() => null);
  const parsed = videoProgressBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const uc = getUpdateVideoProgressUseCase();
  const result = await uc.execute({
    studentId: session.studentId,
    videoId: parsed.data.videoId,
    currentTimeSeconds: parsed.data.currentTimeSeconds,
    durationSeconds: parsed.data.durationSeconds,
    incrementView: parsed.data.incrementView,
  });
  return NextResponse.json({
    completionRate: result.progress.completionRate,
    isCompleted: result.progress.isCompleted,
    canTakeQuiz: result.canTakeQuiz,
  });
}
