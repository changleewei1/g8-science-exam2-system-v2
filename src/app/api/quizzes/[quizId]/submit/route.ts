import { NextResponse } from "next/server";
import { getSubmitQuizUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";
import { submitQuizBodySchema } from "@/lib/validation";

type Params = { quizId: string };

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { quizId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = submitQuizBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const uc = getSubmitQuizUseCase();
  try {
    const result = await uc.execute(quizId, session.studentId, parsed.data.answers);
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "VIDEO_NOT_COMPLETED") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    if (msg === "QUIZ_NOT_FOUND" || msg === "NO_QUESTIONS") {
      return NextResponse.json({ error: msg }, { status: 404 });
    }
    throw e;
  }
}
