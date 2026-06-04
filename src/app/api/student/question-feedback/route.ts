import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { fetchQuestionQualityStats } from "@/lib/question-quality/questionQualityService";
import { resolveExamScopeIdFromVideoId } from "@/lib/resolve-video-exam-scope";
import { DEFAULT_SUBJECT_KEY } from "@/lib/subject-defaults";
import { getStudentSession } from "@/lib/session";

const bodySchema = z.object({
  questionId: z.string().uuid(),
  videoId: z.string().uuid().optional(),
  skillCode: z.string().max(200).optional(),
  examScopeId: z.string().uuid().optional(),
  subjectKey: z.string().max(120).optional(),
  feedbackType: z.enum(["helpful", "not_related", "confusing", "wrong_answer", "bad_explanation"]),
  comment: z.string().max(2000).optional(),
});

export async function GET(req: Request) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const questionId = searchParams.get("questionId")?.trim();
  if (!questionId || !z.string().uuid().safeParse(questionId).success) {
    return NextResponse.json({ error: "INVALID_QUERY" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let { data, error } = await supabase
    .from("question_feedback")
    .select("feedback_type, comment, created_at, updated_at")
    .eq("question_id", questionId)
    .eq("student_id", session.studentId)
    .maybeSingle();
  if (error && /updated_at|42703|column/i.test(String(error.message ?? ""))) {
    const second = await supabase
      .from("question_feedback")
      .select("feedback_type, comment, created_at")
      .eq("question_id", questionId)
      .eq("student_id", session.studentId)
      .maybeSingle();
    data = second.data as typeof data;
    error = second.error;
  }

  if (error) {
    return NextResponse.json({ error: "LOAD_FAILED", detail: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ hasFeedback: false });
  }

  const row = data as {
    feedback_type: string;
    comment: string | null;
    created_at: string;
    updated_at?: string;
  };
  return NextResponse.json({
    hasFeedback: true,
    feedbackType: row.feedback_type,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
  });
}

export async function POST(req: Request) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }

  const { questionId, videoId, examScopeId, feedbackType, comment, skillCode, subjectKey } = parsed.data;
  const supabase = getSupabaseAdmin();

  const { data: bank, error: bErr } = await supabase
    .from("question_bank_items")
    .select("id")
    .eq("id", questionId)
    .maybeSingle();
  if (bErr) return NextResponse.json({ error: "LOOKUP_FAILED" }, { status: 500 });
  if (!bank) return NextResponse.json({ error: "QUESTION_NOT_FOUND" }, { status: 404 });

  let scopeId: string | null = examScopeId ?? null;
  if (!scopeId && videoId) {
    scopeId = await resolveExamScopeIdFromVideoId(videoId);
  }

  const sk = (subjectKey ?? "").trim() || DEFAULT_SUBJECT_KEY;
  const sc = (skillCode ?? "").trim() || null;

  const baseRow = {
    question_id: questionId,
    video_id: videoId ?? null,
    student_id: session.studentId,
    exam_scope_id: scopeId,
    feedback_type: feedbackType,
    comment: comment?.trim() ? comment.trim() : null,
  };
  const extendedRow = {
    ...baseRow,
    skill_code: sc,
    subject_key: sk,
  };

  let upErr = (
    await supabase.from("question_feedback").upsert(extendedRow, {
      onConflict: "student_id,question_id",
    })
  ).error;

  if (
    upErr &&
    (/skill_code|subject_key|updated_at|42703|column/i.test(String(upErr.message ?? "")) ||
      /schema cache/i.test(String(upErr.message ?? "")))
  ) {
    upErr = (
      await supabase.from("question_feedback").upsert(baseRow, {
        onConflict: "student_id,question_id",
      })
    ).error;
  }

  if (upErr) {
    return NextResponse.json({ error: "SAVE_FAILED", detail: upErr.message }, { status: 500 });
  }

  const statsRes = await fetchQuestionQualityStats(questionId);

  return NextResponse.json({
    ok: true,
    quality: statsRes.ok ? statsRes.stats : null,
  });
}
