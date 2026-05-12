import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

const SKILL_NAME_MAP: Record<string, string> = {
  EL01: "電解質的基本概念",
  EL02: "電解質與非電解質判斷",
  EL03: "電解質導電原理",
  EL04: "電解質的實驗判斷",
  EL05: "強電解質與弱電解質",
  EL06: "電解質的生活應用",
  AB01: "酸的基本性質",
  AB02: "鹼的基本性質",
  AB03: "酸的生活應用與辨識",
  AB04: "鹼的生活應用與辨識",
  AB05: "pH值與酸鹼判斷",
  AB06: "酸鹼安全與操作",
  CO01: "濃度的基本概念",
  CO02: "濃度比較與判斷",
  CO03: "濃度的定性判斷",
  CO04: "稀釋與濃度變化",
  CO05: "濃度的生活應用",
  NE01: "中和反應基本概念",
  NE02: "中和後溶液性質",
  NE03: "中和反應判斷",
  NE04: "中和與滴定概念",
  NE05: "中和的生活應用",
  RS01: "反應速率的意義",
  RS02: "影響反應速率的因素",
  RS03: "溫度對反應速率的影響",
  RS04: "濃度對反應速率的影響",
  RS05: "比較反應快慢",
  RS06: "控制變因的判斷",
  RS07: "生活中的反應速率",
  RS08: "反應速率的定量比較",
  RS09: "平均反應速率計算",
  RS10: "反應速率圖表判讀",
  RS11: "條件改變下的速率比較",
};

const postBodySchema = z.object({
  video_id: z.string().uuid(),
  skill_code: z.string().min(1).max(32),
});

function normSkillCode(s: string): string {
  return s.trim().toUpperCase();
}

function resolveSkillName(code: string, name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed === code) return SKILL_NAME_MAP[code] ?? code;
  return trimmed;
}

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const unitId = (url.searchParams.get("unitId") ?? "").trim();
  const skillCode = normSkillCode(url.searchParams.get("skillCode") ?? "");

  try {
    const supabase = getSupabaseAdmin();

    let query = supabase
      .from("videos")
      .select(
        "id, title, youtube_video_id, unit_id, sort_order, created_at, scope_units(id, unit_title, unit_code, sort_order), video_skill_tags(id, skill_code, skill_name, created_at)",
      )
      .order("sort_order", { ascending: true })
      .limit(500);

    if (q) {
      query = query.ilike("title", `%${q}%`);
    }
    if (unitId) {
      query = query.eq("unit_id", unitId);
    }

    const { data, error } = await query;
    if (error) throw error;

    let rows = data ?? [];
    if (skillCode) {
      rows = rows.filter((v) =>
        Array.isArray((v as { video_skill_tags?: unknown }).video_skill_tags)
          ? ((v as { video_skill_tags: Array<{ skill_code: string }> }).video_skill_tags ?? []).some(
              (t) => t.skill_code.toUpperCase() === skillCode,
            )
          : false,
      );
    }

    const { data: units, error: uErr } = await supabase
      .from("scope_units")
      .select("id, unit_title, unit_code, sort_order")
      .order("sort_order", { ascending: true });
    if (uErr) throw uErr;

    const { data: skills, error: sErr } = await supabase
      .from("skill_tags")
      .select("code, name, unit")
      .order("code", { ascending: true })
      .limit(5000);
    if (sErr) throw sErr;

    const skillRows = (skills ?? []).map((s) => ({
      code: s.code as string,
      name: resolveSkillName(s.code as string, s.name as string | null | undefined),
      unit: (s.unit as string | null) ?? null,
    }));

    return NextResponse.json({ videos: rows, units: units ?? [], skills: skillRows });
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

  const videoId = parsed.data.video_id;
  const skillCode = normSkillCode(parsed.data.skill_code);

  try {
    const supabase = getSupabaseAdmin();

    const { data: video, error: vErr } = await supabase
      .from("videos")
      .select("id, title")
      .eq("id", videoId)
      .maybeSingle();
    if (vErr) throw vErr;
    if (!video) return NextResponse.json({ error: "VIDEO_NOT_FOUND" }, { status: 400 });

    const { data: skill, error: sErr } = await supabase
      .from("skill_tags")
      .select("code, name")
      .eq("code", skillCode)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!skill) return NextResponse.json({ error: "SKILL_CODE_NOT_FOUND" }, { status: 400 });

    const { data: existed, error: exErr } = await supabase
      .from("video_skill_tags")
      .select("id")
      .eq("video_id", videoId)
      .eq("skill_code", skillCode)
      .maybeSingle();
    if (exErr) throw exErr;
    if (existed) return NextResponse.json({ error: "ALREADY_EXISTS" }, { status: 409 });

    const { data: inserted, error: insErr } = await supabase
      .from("video_skill_tags")
      .insert({
        video_id: videoId,
        skill_code: skillCode,
        skill_name: skill.name || skillCode,
      })
      .select("id, video_id, skill_code, skill_name, created_at")
      .single();
    if (insErr) throw insErr;

    return NextResponse.json({ ok: true, tag: inserted, video: { id: video.id, title: video.title } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "CREATE_FAILED", detail: msg }, { status: 500 });
  }
}

