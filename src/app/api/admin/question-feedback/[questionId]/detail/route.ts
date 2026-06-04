import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Params = { questionId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { questionId } = await ctx.params;

  const supabase = getSupabaseAdmin();

  const { data: bank, error: bErr } = await supabase
    .from("question_bank_items")
    .select(
      "id, unit, skill_code, video_id, exam_scope_id, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation, is_ai_generated, source_key",
    )
    .eq("id", questionId)
    .maybeSingle();
  if (bErr) return NextResponse.json({ error: "BANK_FAILED", detail: bErr.message }, { status: 500 });
  if (!bank) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  let video: { id: string; title: string; subtitle_text: string | null } | null = null;
  const vid = bank.video_id as string | null;
  if (vid) {
    const { data: v } = await supabase.from("videos").select("id, title, subtitle_text").eq("id", vid).maybeSingle();
    if (v && typeof v === "object" && "id" in v) {
      video = {
        id: String((v as { id: string }).id),
        title: String((v as { title: string }).title ?? ""),
        subtitle_text: ((v as { subtitle_text: string | null }).subtitle_text as string | null) ?? null,
      };
    }
  }

  const { data: stats } = await supabase
    .from("question_quality_stats")
    .select("*")
    .eq("question_id", questionId)
    .maybeSingle();

  const { data: feedback } = await supabase
    .from("question_feedback")
    .select("id, student_id, feedback_type, comment, video_id, skill_code, subject_key, created_at, updated_at")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false })
    .limit(200);

  const { data: skillMeta } = await supabase
    .from("skill_tags")
    .select("code, name, common_mistakes, sample_question")
    .eq("code", bank.skill_code as string)
    .maybeSingle();

  const subtitleSnippet =
    video?.subtitle_text && video.subtitle_text.length > 0
      ? video.subtitle_text.slice(0, 1200)
      : null;

  return NextResponse.json({
    bank,
    video,
    stats,
    feedback: feedback ?? [],
    skillMeta,
    subtitleSnippet,
  });
}
