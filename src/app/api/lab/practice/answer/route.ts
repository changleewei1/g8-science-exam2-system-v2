import { NextResponse } from "next/server";
import {
  computeStateAfterAnswer,
  normalizeMcqAnswer,
  type AdaptivePracticeDifficulty,
} from "@/domain/services/adaptive-practice-service";
import { isAdaptivePracticeLabEnabled } from "@/lib/feature-flags";
import { labPracticeFeatureDisabledResponse } from "@/lib/lab/lab-practice-disabled-response";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getStudentSession } from "@/lib/session";
import { practiceAnswerBodySchema } from "@/lib/validation";

function parseDifficulty(raw: string): AdaptivePracticeDifficulty {
  return raw === "進階" ? "進階" : "基礎";
}

export async function POST(req: Request) {
  if (!isAdaptivePracticeLabEnabled()) {
    return labPracticeFeatureDisabledResponse();
  }

  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "請先登入。" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY", message: "無法讀取請求內容。" }, { status: 400 });
  }

  const parsed = practiceAnswerBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", message: "請提供 session_id、question_id 與答案。" }, { status: 400 });
  }

  const { session_id, question_id, answer } = parsed.data;

  try {
    const supabase = getSupabaseAdmin();

    const { data: practiceSession, error: seErr } = await supabase
      .from("adaptive_practice_sessions")
      .select("id, student_id, skill_code, score, streak, current_difficulty, is_mastered")
      .eq("id", session_id)
      .maybeSingle();

    if (seErr) {
      return NextResponse.json({ error: "LOAD_FAILED", message: "無法讀取練習狀態。", detail: seErr.message }, { status: 500 });
    }
    if (!practiceSession) {
      return NextResponse.json({ error: "SESSION_NOT_FOUND", message: "找不到這場練習，請重新開始。" }, { status: 404 });
    }
    if (practiceSession.student_id !== session.studentId) {
      return NextResponse.json({ error: "FORBIDDEN", message: "這場練習不屬於你的帳號。" }, { status: 403 });
    }

    const { data: question, error: qErr } = await supabase
      .from("question_bank_items")
      .select("id, skill_code, correct_answer, explanation")
      .eq("id", question_id)
      .maybeSingle();

    if (qErr) {
      return NextResponse.json({ error: "LOAD_FAILED", message: "無法讀取題目。", detail: qErr.message }, { status: 500 });
    }
    if (!question) {
      return NextResponse.json({ error: "QUESTION_NOT_FOUND", message: "找不到這一題。" }, { status: 404 });
    }
    if (question.skill_code !== practiceSession.skill_code) {
      return NextResponse.json({ error: "QUESTION_MISMATCH", message: "題目與目前練習的能力不符。" }, { status: 400 });
    }

    const difficultyBefore = parseDifficulty(practiceSession.current_difficulty);
    const selected = normalizeMcqAnswer(answer);
    const correct = normalizeMcqAnswer(question.correct_answer);
    const is_correct = selected === correct && selected.length > 0;

    const next = computeStateAfterAnswer({
      score: practiceSession.score,
      streak: practiceSession.streak,
      difficulty: difficultyBefore,
      isCorrect: is_correct,
    });

    const { error: insErr } = await supabase.from("adaptive_practice_answers").insert({
      session_id: practiceSession.id,
      question_id: question.id,
      is_correct,
      difficulty: difficultyBefore,
    });

    if (insErr) {
      return NextResponse.json({ error: "SAVE_FAILED", message: "無法儲存作答紀錄。", detail: insErr.message }, { status: 500 });
    }

    const { error: upErr } = await supabase
      .from("adaptive_practice_sessions")
      .update({
        score: next.score,
        streak: next.streak,
        current_difficulty: next.difficulty,
        is_mastered: next.isMastered,
        updated_at: new Date().toISOString(),
      })
      .eq("id", practiceSession.id);

    if (upErr) {
      return NextResponse.json({ error: "SAVE_FAILED", message: "無法更新練習進度。", detail: upErr.message }, { status: 500 });
    }

    return NextResponse.json({
      is_correct,
      correct_answer: question.correct_answer,
      explanation: question.explanation ?? "",
      score: next.score,
      difficulty: next.difficulty,
      streak: next.streak,
      is_mastered: next.isMastered,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "SERVER_ERROR", message: "系統暫時無法處理，請稍後再試。", detail: msg }, { status: 500 });
  }
}
