import { NextResponse } from "next/server";
import { getListUnitVideosUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

type Params = { unitId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { unitId } = await ctx.params;
  const uc = getListUnitVideosUseCase();
  const rows = await uc.execute(unitId, session.studentId);
  return NextResponse.json({
    videos: rows.map((r) => ({
      id: r.video.id,
      title: r.video.title,
      youtubeVideoId: r.video.youtubeVideoId,
      thumbnailUrl: r.video.thumbnailUrl,
      durationSeconds: r.video.durationSeconds,
      sortOrder: r.video.sortOrder,
      completionRate: r.completionRate,
      isCompleted: r.isCompleted,
      canTakeQuiz: r.canTakeQuiz,
      quizId: r.quizId,
      quizPassed: r.quizPassed,
    })),
  });
}
