import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { fetchSubtitleByYtDlp, generateMcqsWithOpenAI } from "@/lib/admin/video-ai";
import { getAdminSession } from "@/lib/session";

const bodySchema = z.object({
  manual_subtitle: z.string().optional(),
  per_skill: z.number().int().min(1).max(10).optional().default(3),
  model: z.string().optional(),
});

type Params = { id: string };

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id: videoUuid } = await ctx.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const parsed = bodySchema.safeParse(body);

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiKey) {
    return NextResponse.json(
      {
        error: "OPENAI_MISSING",
        message: "尚未設定 OPENAI_API_KEY，無法生成題目。",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: video, error: vErr } = await supabase
      .from("videos")
      .select("id, unit_id, youtube_video_id, title, subtitle_text")
      .eq("id", videoUuid)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!video) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const { data: unit, error: uErr } = await supabase
      .from("scope_units")
      .select("unit_title")
      .eq("id", video.unit_id as string)
      .maybeSingle();
    if (uErr) throw uErr;
    const unitForBank = unit?.unit_title ?? "未知單元";

    const { data: tagRows, error: tgErr } = await supabase
      .from("video_skill_tags")
      .select("skill_code, skill_name")
      .eq("video_id", videoUuid);
    if (tgErr) throw tgErr;
    const tags = tagRows ?? [];
    if (tags.length === 0) {
      return NextResponse.json(
        {
          error: "NO_SKILLS_TAGGED",
          message: "請先完成 skill 對應（正式 video_skill_tags）後再生成題目。可先「分析影片」並審核套用建議。",
        },
        { status: 400 },
      );
    }

    let subtitle =
      parsed.success && parsed.data.manual_subtitle?.trim()
        ? parsed.data.manual_subtitle.trim()
        : ((video.subtitle_text as string | null) ?? "").trim();
    if (!subtitle) {
      subtitle = await fetchSubtitleByYtDlp(video.youtube_video_id as string);
    }
    if (!subtitle) {
      return NextResponse.json({
        error: "NO_SUBTITLE",
        message: "無法取得字幕，請改用手動貼字幕後再生成題目。",
      });
    }

    await supabase
      .from("videos")
      .update({ subtitle_text: subtitle.slice(0, 500000), management_status: "pending_review" })
      .eq("id", videoUuid);

    const perSkill = parsed.success ? parsed.data.per_skill : 3;
    const model = (parsed.success && parsed.data.model) || "gpt-4o-mini";
    let inserted = 0;

    for (const t of tags) {
      const skillCode = String(t.skill_code ?? "").trim().toUpperCase();
      const skillName = String(t.skill_name ?? "").trim() || skillCode;
      const items = await generateMcqsWithOpenAI({
        apiKey: openAiKey,
        model,
        unit: unitForBank,
        skillCode,
        skillName,
        title: video.title as string,
        subtitleText: subtitle,
        count: perSkill,
      });

      for (const it of items) {
        const excerpt = subtitle.slice(0, 500);
        const { error: insErr } = await supabase.from("generated_question_candidates").insert({
          video_id: videoUuid,
          unit: it.unit || unitForBank,
          skill_code: it.skill_code,
          difficulty: it.difficulty,
          question_text: it.question_text,
          choice_a: it.choice_a,
          choice_b: it.choice_b,
          choice_c: it.choice_c,
          choice_d: it.choice_d,
          correct_answer: it.correct_answer,
          explanation: it.explanation,
          source_excerpt: excerpt,
          status: "draft",
        });
        if (insErr?.message.includes("does not exist")) {
          return NextResponse.json({
            error: "DB_NOT_READY",
            message: "請先在資料庫執行 migration：20260509130000_teacher_video_management.sql",
          });
        }
        if (insErr) throw insErr;
        inserted += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      inserted,
      message: `已寫入 ${inserted} 筆題目候選（draft）；請至「題目候選」審核核准後才會進題庫。`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "GENERATE_FAILED", detail: msg }, { status: 500 });
  }
}
