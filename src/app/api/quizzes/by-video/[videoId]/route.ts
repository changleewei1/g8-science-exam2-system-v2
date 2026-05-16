import { NextResponse } from "next/server";
import { getQuizByVideoUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

type Params = { videoId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { videoId } = await ctx.params;
  const uc = getQuizByVideoUseCase();
  const data = await uc.execute(videoId, session.studentId);
  if (!data || !data.quiz) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  if (!data.unlocked) {
    return NextResponse.json(
      { error: "VIDEO_NOT_COMPLETED", unlocked: false },
      { status: 403 },
    );
  }
  return NextResponse.json({
    quiz: {
      id: data.quiz.id,
      title: data.quiz.title,
      passScore: data.quiz.passScore,
      questionCount: data.quiz.questionCount,
    },
    questions: data.questions,
    quizIncomplete: Boolean((data as { quizIncomplete?: boolean }).quizIncomplete),
    incompleteMessage:
      (data as { quizIncomplete?: boolean }).quizIncomplete === true
        ? "此影片尚未建立完整測驗題（需至少 3 題已核准並同步至測驗）。"
        : undefined,
  });
}
