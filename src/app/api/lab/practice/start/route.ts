import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { isAdaptivePracticeLabEnabled } from "@/lib/feature-flags";
import { labPracticeFeatureDisabledResponse } from "@/lib/lab/lab-practice-disabled-response";
import { getStudentSession } from "@/lib/session";
import { practiceStartBodySchema } from "@/lib/validation";

async function skillCodeIsValid(supabase: ReturnType<typeof getSupabaseAdmin>, skillCode: string): Promise<boolean> {
  const { data: tag } = await supabase.from("skill_tags").select("code").eq("code", skillCode).maybeSingle();
  if (tag) return true;
  const { data: bank } = await supabase
    .from("question_bank_items")
    .select("id")
    .eq("skill_code", skillCode)
    .limit(1)
    .maybeSingle();
  return Boolean(bank);
}

export async function POST(req: Request) {
  if (!isAdaptivePracticeLabEnabled()) {
    return labPracticeFeatureDisabledResponse();
  }

  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "請先登入後再開始智慧練習。" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_BODY", message: "無法讀取請求內容。" }, { status: 400 });
  }

  const parsed = practiceStartBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY", message: "請提供有效的能力代碼（skill_code）。" }, { status: 400 });
  }

  const skill_code = parsed.data.skill_code.trim();
  if (!skill_code) {
    return NextResponse.json({ error: "INVALID_BODY", message: "能力代碼不可為空白。" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const ok = await skillCodeIsValid(supabase, skill_code);
    if (!ok) {
      return NextResponse.json(
        {
          error: "SKILL_NOT_FOUND",
          message: "找不到這個能力代碼，或題庫中尚無相關題目。請確認代碼是否正確。",
        },
        { status: 404 },
      );
    }

    const { data: row, error } = await supabase
      .from("adaptive_practice_sessions")
      .insert({
        student_id: session.studentId,
        skill_code,
        score: 50,
        current_difficulty: "基礎",
        streak: 0,
        is_mastered: false,
      })
      .select("id, score, current_difficulty")
      .single();

    if (error || !row) {
      const detail = error?.message ?? "未知錯誤";
      if (detail.includes("does not exist") || detail.includes("adaptive_practice")) {
        return NextResponse.json(
          {
            error: "DB_NOT_READY",
            message: "智慧練習資料表尚未建立，請管理者執行資料庫 migration 後再試。",
            detail,
          },
          { status: 503 },
        );
      }
      return NextResponse.json({ error: "START_FAILED", message: "無法開始練習，請稍後再試。", detail }, { status: 500 });
    }

    return NextResponse.json({
      session_id: row.id,
      score: row.score,
      difficulty: row.current_difficulty,
      streak: 0,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: "SERVER_ERROR", message: "系統暫時無法處理，請稍後再試。", detail: msg }, { status: 500 });
  }
}
