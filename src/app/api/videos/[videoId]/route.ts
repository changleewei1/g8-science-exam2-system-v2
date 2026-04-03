import { NextResponse } from "next/server";
import { getVideoDetailUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

type Params = { videoId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { videoId } = await ctx.params;
  const uc = getVideoDetailUseCase();
  const data = await uc.execute(videoId, session.studentId);
  if (!data || !data.video) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  const v = data.video;
  return NextResponse.json({
    video: {
      id: v.id,
      unitId: v.unitId,
      youtubeVideoId: v.youtubeVideoId,
      title: v.title,
      description: v.description,
      durationSeconds: v.durationSeconds,
      thumbnailUrl: v.thumbnailUrl,
    },
    progress: data.progress
      ? {
          completionRate: data.progress.completionRate,
          isCompleted: data.progress.isCompleted,
          canTakeQuiz: data.progress.canTakeQuiz(),
          lastPositionSeconds: data.progress.lastPositionSeconds,
        }
      : null,
    quiz: data.quiz
      ? { id: data.quiz.id, title: data.quiz.title, passScore: data.quiz.passScore }
      : null,
  });
}
