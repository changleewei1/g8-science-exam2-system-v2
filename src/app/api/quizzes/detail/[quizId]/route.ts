import { NextResponse } from "next/server";
import { getQuizDetailUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

type Params = { quizId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { quizId } = await ctx.params;
  const uc = getQuizDetailUseCase();
  const data = await uc.execute(quizId, session.studentId);
  if (!data || !data.quiz) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!data.unlocked) {
    return NextResponse.json(
      { error: "VIDEO_NOT_COMPLETED", unlocked: false, videoId: data.videoId },
      { status: 403 },
    );
  }
  return NextResponse.json({
    videoId: data.videoId,
    quiz: {
      id: data.quiz.id,
      title: data.quiz.title,
      passScore: data.quiz.passScore,
    },
    questions: data.questions,
  });
}
