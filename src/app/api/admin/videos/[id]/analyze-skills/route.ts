import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import {
  fetchSubtitleByYtDlp,
  suggestSkillsWithOpenAI,
  unitAliasesForSkillTags,
} from "@/lib/admin/video-ai";
import { getAdminSession } from "@/lib/session";

const bodySchema = z.object({
  manual_subtitle: z.string().optional(),
  model: z.string().optional(),
});

type Params = { id: string };

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id: videoUuid } = await ctx.params;

  let body: unknown = {};
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
        message: "尚未設定 OPENAI_API_KEY，無法分析影片。",
      },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: video, error: vErr } = await supabase
      .from("videos")
      .select("id, unit_id, youtube_video_id, title, subtitle_text, management_status")
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
    const unitTitle = unit?.unit_title ?? "未知單元";
    const aliases = unitAliasesForSkillTags(unitTitle);

    const { data: skillsRows, error: sErr } = await supabase
      .from("skill_tags")
      .select("code, name")
      .in("unit", aliases)
      .order("code", { ascending: true })
      .limit(500);
    if (sErr) throw sErr;
    const skills = (skillsRows ?? []).map((s) => ({ code: s.code as string, name: (s.name as string) ?? s.code }));

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
        message: "無法取得字幕；請先手動貼上字幕後再分析，或確認本機有可用的 yt-dlp。",
      });
    }

    const excerpt = subtitle.slice(0, 800);

    const { error: subUpErr } = await supabase
      .from("videos")
      .update({ subtitle_text: subtitle.slice(0, 500000), management_status: "pending_review" })
      .eq("id", videoUuid);
    if (subUpErr) throw subUpErr;

    const suggestions = await suggestSkillsWithOpenAI({
      apiKey: openAiKey,
      model: (parsed.success && parsed.data.model) || "gpt-4o-mini",
      unit: unitTitle,
      title: video.title as string,
      subtitle,
      skills,
    });

    if (suggestions.length === 0) {
      return NextResponse.json({
        warning: "NO_SUGGESTIONS",
        message: "模型未輸出有效 skill（請確認 skill_tags.unit 是否涵蓋此單元）。",
      });
    }

    let created = 0;
    for (const s of suggestions) {
      const { data: existed } = await supabase
        .from("video_skill_mapping_candidates")
        .select("id")
        .eq("video_id", videoUuid)
        .eq("suggested_skill_code", s.suggested_skill_code)
        .eq("status", "pending")
        .maybeSingle();
      if (existed) continue;

      const ins: Record<string, unknown> = {
        video_id: videoUuid,
        video_title: video.title as string,
        unit: unitTitle,
        suggested_skill_code: s.suggested_skill_code,
        suggested_skill_name: s.suggested_skill_name,
        confidence: s.confidence,
        reason: s.reason,
        subtitle_excerpt: excerpt,
        subtitle_available: true,
        status: "pending",
      };

      const { error: insErr } = await supabase.from("video_skill_mapping_candidates").insert(ins);
      if (insErr && !insErr.message.includes("does not exist")) throw insErr;
      created += 1;
    }

    return NextResponse.json({
      ok: true,
      created_candidates: created,
      message: `已新增 ${created} 筆 skill 候選（待審核），不會自動寫入正式 video_skill_tags。`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "ANALYZE_FAILED", detail: msg }, { status: 500 });
  }
}
