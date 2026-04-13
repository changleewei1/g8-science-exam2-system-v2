import { NextResponse } from "next/server";
import { getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import { adminPutQuizQuestionsBodySchema } from "@/lib/validation";
import { getSupabaseErrorMessage } from "@/lib/supabase-user-message";

type Params = { quizId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { quizId } = await ctx.params;
  const { quizzes, quizQuestions, videos } = getRepositories();

  const quiz = await quizzes.findById(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "QUIZ_NOT_FOUND" }, { status: 404 });
  }
  const video = await videos.findById(quiz.videoId);
  if (!video) {
    return NextResponse.json({ error: "VIDEO_NOT_FOUND" }, { status: 404 });
  }

  const questions = await quizQuestions.findByQuizId(quizId);
  const sorted = [...questions].sort((a, b) => a.sortOrder - b.sortOrder);

  return NextResponse.json({
    quiz: {
      id: quiz.id,
      title: quiz.title,
      passScore: quiz.passScore,
      videoId: quiz.videoId,
    },
    video: {
      id: video.id,
      title: video.title,
      unitId: video.unitId,
      sortOrder: video.sortOrder,
    },
    questions: sorted.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      questionImageUrl: q.questionImageUrl,
      referenceImageUrl: q.referenceImageUrl,
      choiceA: q.choiceA,
      choiceB: q.choiceB,
      choiceC: q.choiceC,
      choiceD: q.choiceD,
      choiceAImageUrl: q.choiceAImageUrl,
      choiceBImageUrl: q.choiceBImageUrl,
      choiceCImageUrl: q.choiceCImageUrl,
      choiceDImageUrl: q.choiceDImageUrl,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      sortOrder: q.sortOrder,
      difficulty: q.difficulty,
      skillCode: q.skillCode,
    })),
  });
}

export async function PUT(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { quizId } = await ctx.params;
  const { quizzes, quizQuestions, skillTags } = getRepositories();

  const quiz = await quizzes.findById(quizId);
  if (!quiz) {
    return NextResponse.json({ error: "QUIZ_NOT_FOUND" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = adminPutQuizQuestionsBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const tags = await skillTags.findAll();
  const codeSet = new Set(tags.map((t) => t.code));
  for (const q of parsed.data.questions) {
    if (!codeSet.has(q.skill_code)) {
      return NextResponse.json(
        { error: "INVALID_SKILL_CODE", skill_code: q.skill_code },
        { status: 400 },
      );
    }
  }

  const nu = (s: string) => (s.trim() ? s.trim() : null);
  const rows = parsed.data.questions.map((q) => ({
    question_text: q.question_text,
    choice_a: q.choice_a,
    choice_b: q.choice_b,
    choice_c: q.choice_c,
    choice_d: q.choice_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? null,
    difficulty: q.difficulty ?? null,
    skill_code: q.skill_code,
    question_image_url: nu(q.question_image_url),
    reference_image_url: nu(q.reference_image_url),
    choice_a_image_url: nu(q.choice_a_image_url),
    choice_b_image_url: nu(q.choice_b_image_url),
    choice_c_image_url: nu(q.choice_c_image_url),
    choice_d_image_url: nu(q.choice_d_image_url),
  }));

  try {
    await quizQuestions.syncQuestionsForQuiz(quizId, rows);
    await quizzes.syncQuestionCountMeta(quizId, rows.length);
  } catch (e) {
    const msg = e instanceof Error ? e.message : getSupabaseErrorMessage(e);
    if (msg === "AT_LEAST_ONE_QUESTION_REQUIRED") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, questionCount: rows.length });
}
