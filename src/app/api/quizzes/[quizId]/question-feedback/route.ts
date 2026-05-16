import { NextResponse } from "next/server";
import { z } from "zod";
import { getQuizService } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

const bodySchema = z.object({
  questionId: z.string().uuid(),
  selectedAnswer: z.string().min(1).max(8),
});

type Params = { quizId: string };

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { quizId } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  try {
    const svc = getQuizService();
    const out = await svc.getQuestionFeedback(
      quizId,
      session.studentId,
      parsed.data.questionId,
      parsed.data.selectedAnswer,
    );
    return NextResponse.json(out);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "VIDEO_NOT_COMPLETED") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg === "QUIZ_NOT_FOUND" || msg === "QUESTION_NOT_FOUND") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    return NextResponse.json({ error: "FEEDBACK_FAILED", detail: msg }, { status: 500 });
  }
}
