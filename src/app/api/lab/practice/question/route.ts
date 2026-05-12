import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { isAdaptivePracticeLabEnabled } from "@/lib/feature-flags";
import { labPracticeFeatureDisabledResponse } from "@/lib/lab/lab-practice-disabled-response";
import { getStudentSession } from "@/lib/session";

function parseDifficulty(raw: string): "基礎" | "進階" {
  return raw === "進階" ? "進階" : "基礎";
}

const NO_QUESTIONS_MSG =
  "目前這個觀念尚未建立足夠題目，請先選擇其他觀念練習。";

export async function GET(req: Request) {
  if (!isAdaptivePracticeLabEnabled()) {
    return labPracticeFeatureDisabledResponse();
  }

  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "請先登入。" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id")?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "INVALID_QUERY", message: "請提供 session_id。" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: practiceSession, error: seErr } = await supabase
      .from("adaptive_practice_sessions")
      .select("id, student_id, skill_code, current_difficulty")
      .eq("id", sessionId)
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

    const currentDifficulty = parseDifficulty(practiceSession.current_difficulty);
    const skill_code = practiceSession.skill_code;

    const selectCols = "id, question_text, choice_a, choice_b, choice_c, choice_d";

    const { data: strictRows, error: strictErr } = await supabase
      .from("question_bank_items")
      .select(selectCols)
      .eq("skill_code", skill_code)
      .eq("difficulty", currentDifficulty);

    if (strictErr) {
      return NextResponse.json({ error: "LOAD_FAILED", message: "無法載入題目。", detail: strictErr.message }, { status: 500 });
    }

    let rows = strictRows ?? [];

    if (rows.length === 0) {
      const { data: anyRows, error: anyErr } = await supabase
        .from("question_bank_items")
        .select(selectCols)
        .eq("skill_code", skill_code);

      if (anyErr) {
        return NextResponse.json({ error: "LOAD_FAILED", message: "無法載入題目。", detail: anyErr.message }, { status: 500 });
      }
      rows = anyRows ?? [];
    }

    if (rows.length === 0) {
      return NextResponse.json(
        {
          error: "NO_QUESTIONS",
          message: NO_QUESTIONS_MSG,
        },
        { status: 404 },
      );
    }

    const pick = rows[Math.floor(Math.random() * rows.length)]!;

    return NextResponse.json({
      question_id: pick.id,
      question_text: pick.question_text,
      choices: {
        A: pick.choice_a,
        B: pick.choice_b,
        C: pick.choice_c,
        D: pick.choice_d,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "SERVER_ERROR", message: "系統暫時無法處理，請稍後再試。", detail: msg }, { status: 500 });
  }
}
