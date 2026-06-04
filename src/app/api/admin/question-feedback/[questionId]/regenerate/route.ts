import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { questionId: string };

/**
 * 依原題、字幕、技能與學生回饋建立一筆 generated_question_candidates（draft），不覆寫正式題。
 */
export async function POST(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { questionId } = await ctx.params;

  const supabase = getSupabaseAdmin();

  const { data: bank, error: bErr } = await supabase
    .from("question_bank_items")
    .select(
      "id, unit, skill_code, difficulty, video_id, exam_scope_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation",
    )
    .eq("id", questionId)
    .maybeSingle();
  if (bErr) return NextResponse.json({ error: "BANK_FAILED", detail: bErr.message }, { status: 500 });
  if (!bank) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const videoId = bank.video_id as string | null;
  if (!videoId) {
    return NextResponse.json(
      { error: "NO_VIDEO", message: "此題未綁定影片，無法寫入候選重產題（generated_question_candidates 需 video_id）。" },
      { status: 400 },
    );
  }

  const { data: vrow } = await supabase.from("videos").select("id, title, subtitle_text").eq("id", videoId).maybeSingle();
  const subtitle = ((vrow?.subtitle_text as string | null) ?? "").trim();
  const excerptHead = subtitle.length > 0 ? subtitle.slice(0, 800) : "（尚無字幕）";

  const { data: fbRows } = await supabase
    .from("question_feedback")
    .select("feedback_type, comment, created_at")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(40);

  const fbLines = (fbRows ?? [])
    .map((r) => {
      const row = r as { feedback_type: string; comment: string | null; created_at: string };
      const c = row.comment?.trim();
      return `- ${row.feedback_type}${c ? `：${c}` : ""}`;
    })
    .join("\n");

  const { data: skillMeta } = await supabase
    .from("skill_tags")
    .select("common_mistakes, sample_question")
    .eq("code", bank.skill_code as string)
    .maybeSingle();

  const cm = (skillMeta?.common_mistakes as string | null)?.trim() ?? "";
  const sq = (skillMeta?.sample_question as string | null)?.trim() ?? "";

  const sourceExcerpt = [
    `【原題重產】bank=${questionId}`,
    `影片：${(vrow?.title as string) ?? ""}`,
    "--- 字幕節錄 ---",
    excerptHead,
    "--- 學生回饋 ---",
    fbLines || "（尚無文字回饋）",
    "--- 技能常見迷思 ---",
    cm || "（無）",
    "--- 範例題 ---",
    sq || "（無）",
  ].join("\n");

  const marker = "（系統：待審核重產候選，請勿直接對外）";
  const qtext = `${marker}\n${String(bank.question_text ?? "").slice(0, 400)}`;

  const { data: ins, error: insErr } = await supabase
    .from("generated_question_candidates")
    .insert({
      video_id: videoId,
      unit: String(bank.unit ?? "單元"),
      skill_code: String(bank.skill_code ?? "").trim(),
      difficulty: String(bank.difficulty ?? "基礎"),
      question_text: qtext,
      choice_a: String(bank.choice_a ?? ""),
      choice_b: String(bank.choice_b ?? ""),
      choice_c: String(bank.choice_c ?? ""),
      choice_d: String(bank.choice_d ?? ""),
      correct_answer: String(bank.correct_answer ?? "A")
        .trim()
        .toUpperCase()
        .charAt(0),
      explanation: `請老師或 AI 產線依回饋改寫。\n原詳解：\n${String(bank.explanation ?? "").slice(0, 1500)}`,
      source_excerpt: sourceExcerpt.slice(0, 12000),
      status: "draft",
      exam_scope_id: (bank.exam_scope_id as string | null) ?? null,
      regenerated_from_bank_item_id: questionId,
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    return NextResponse.json({ error: "INSERT_FAILED", detail: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    candidateId: (ins as { id: string } | null)?.id ?? null,
    message: "已建立候選題（draft），請至「題目候選審核」核准後才會取代正式題並觸發題目更新通知。",
  });
}
