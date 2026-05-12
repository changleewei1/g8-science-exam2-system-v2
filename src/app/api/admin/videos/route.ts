import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";
import { extractYoutubeVideoId, fetchYoutubeTitleOEmbed } from "@/lib/youtube-utils";

const postBodySchema = z.object({
  youtube_url: z.string().min(1),
  unit_id: z.string().uuid(),
  title: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
  /** 預設 false：不影響學生端 */
  is_active: z.boolean().optional().default(false),
  management_status: z.enum(["draft", "pending_review", "active"]).optional().default("draft"),
});

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const supabase = getSupabaseAdmin();
    const { data: videos, error: vErr } = await supabase
      .from("videos")
      .select("id, unit_id, youtube_video_id, title, sort_order, is_active, management_status, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (vErr) throw vErr;

    const { data: units, error: uErr } = await supabase
      .from("scope_units")
      .select("id, exam_scope_id, unit_title, unit_code")
      .limit(500);
    if (uErr) throw uErr;

    const { data: scopes, error: sErr } = await supabase.from("exam_scopes").select("id, title").limit(500);
    if (sErr) throw sErr;

    const unitMap = new Map((units ?? []).map((u) => [u.id as string, u]));
    const scopeMap = new Map((scopes ?? []).map((s) => [s.id as string, s]));

    const vids = (videos ?? []).map((v) => v.id as string);
    let tags: Array<{ video_id: string; skill_code: string }> = [];
    if (vids.length > 0) {
      const { data: tagRows, error: tErr } = await supabase
        .from("video_skill_tags")
        .select("video_id, skill_code")
        .in("video_id", vids);
      if (tErr) throw tErr;
      tags = (tagRows ?? []) as Array<{ video_id: string; skill_code: string }>;
    }

    const tagsByVideo = new Map<string, string[]>();
    tags.forEach((t) => {
      const vid = t.video_id as string;
      const cur = tagsByVideo.get(vid) ?? [];
      cur.push(t.skill_code as string);
      tagsByVideo.set(vid, cur);
    });

    const allCodes = Array.from(new Set(Array.from(tagsByVideo.values()).flat())).filter(Boolean);
    let countsBySkill = new Map<string, number>();
    if (allCodes.length > 0) {
      const { data: banks, error: bErr } = await supabase
        .from("question_bank_items")
        .select("skill_code")
        .in("skill_code", allCodes)
        .limit(20000);
      if (bErr) throw bErr;
      countsBySkill = new Map<string, number>();
      (banks ?? []).forEach((r) => {
        const c = r.skill_code as string;
        countsBySkill.set(c, (countsBySkill.get(c) ?? 0) + 1);
      });
    }

    const rows = (videos ?? []).map((v) => {
      const id = v.id as string;
      const u = unitMap.get(v.unit_id as string);
      const sc = u ? scopeMap.get(u.exam_scope_id as string) : undefined;
      const skillCodes = (tagsByVideo.get(id) ?? []).sort();
      let qCount = 0;
      for (const code of skillCodes) qCount += countsBySkill.get(code) ?? 0;
      const mgmt = ((v as { management_status?: string }).management_status ?? "active").trim();

      let statusLabel = "草稿";
      if (v.is_active && mgmt === "active") statusLabel = "已啟用";
      else if (mgmt === "pending_review") statusLabel = "待審核";

      const youtubeHref = `https://www.youtube.com/watch?v=${v.youtube_video_id}`;

      return {
        id,
        title: v.title,
        youtube_video_id: v.youtube_video_id,
        youtube_url: youtubeHref,
        unit_id: v.unit_id,
        unit_title: u?.unit_title ?? "",
        exam_scope_title: sc?.title ?? "",
        sort_order: v.sort_order ?? 0,
        is_active: v.is_active,
        management_status: mgmt,
        status_label: statusLabel,
        skill_codes: skillCodes,
        question_count_via_skills: qCount,
        created_at: v.created_at,
      };
    });

    return NextResponse.json({
      videos: rows,
      units:
        units?.map((u) => ({
          id: u.id,
          unit_title: u.unit_title,
          unit_code: u.unit_code,
          exam_scope_id: u.exam_scope_id,
          exam_scope_title: scopeMap.get(u.exam_scope_id as string)?.title ?? "",
        })) ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "LOAD_FAILED", detail: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = postBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const ytId = extractYoutubeVideoId(parsed.data.youtube_url);
  if (!ytId) {
    return NextResponse.json({ error: "INVALID_YOUTUBE_URL", message: "無法解析 YouTube 影片 id" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: dup, error: dupErr } = await supabase
      .from("videos")
      .select("id")
      .eq("unit_id", parsed.data.unit_id)
      .eq("youtube_video_id", ytId)
      .limit(1);
    if (dupErr) throw dupErr;
    if ((dup ?? []).length > 0) {
      return NextResponse.json(
        { error: "DUPLICATE_IN_UNIT", message: "同一單元已有此 YouTube 影片 id" },
        { status: 409 },
      );
    }

    const title =
      parsed.data.title?.trim() ||
      (await fetchYoutubeTitleOEmbed(ytId)) ||
      `(未命名) ${ytId}`;

    const { data: inserted, error: insErr } = await supabase
      .from("videos")
      .insert({
        unit_id: parsed.data.unit_id,
        youtube_video_id: ytId,
        playlist_id: null,
        video_order: null,
        title,
        description: null,
        duration_seconds: null,
        thumbnail_url: null,
        subtitle_text: null,
        sort_order: parsed.data.sort_order ?? 0,
        is_active: parsed.data.is_active,
        management_status: parsed.data.management_status,
      })
      .select("id, unit_id, youtube_video_id, title, sort_order, is_active, management_status")
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({
      ok: true,
      video: inserted,
      message: "已建立影片草稿。可進行 skill 對應與題目生成／審核；啟用後學生端才看得到。",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "CREATE_FAILED", detail: msg }, { status: 500 });
  }
}
