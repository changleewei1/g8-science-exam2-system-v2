import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

const bodySchema = z.object({
  updates: z
    .array(
      z.object({
        video_id: z.string().uuid(),
        skill_codes: z.array(z.string().min(1).max(32)),
      }),
    )
    .min(1),
});

function normSkillCode(s: string): string {
  return s.trim().toUpperCase();
}

export async function PATCH(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const updates = parsed.data.updates.map((u) => ({
    video_id: u.video_id,
    skill_codes: Array.from(new Set(u.skill_codes.map(normSkillCode).filter(Boolean))),
  }));

  const videoIds = Array.from(new Set(updates.map((u) => u.video_id)));
  const allSkillCodes = Array.from(new Set(updates.flatMap((u) => u.skill_codes)));

  try {
    const supabase = getSupabaseAdmin();

    const { data: videos, error: vErr } = await supabase.from("videos").select("id").in("id", videoIds);
    if (vErr) throw vErr;
    const existingVideoIds = new Set((videos ?? []).map((v) => v.id as string));
    const missingVideos = videoIds.filter((id) => !existingVideoIds.has(id));
    if (missingVideos.length > 0) {
      return NextResponse.json({ error: "VIDEO_NOT_FOUND", video_ids: missingVideos }, { status: 400 });
    }

    const { data: skills, error: sErr } = await supabase
      .from("skill_tags")
      .select("code, name")
      .in("code", allSkillCodes)
      .limit(5000);
    if (sErr) throw sErr;
    const skillNameByCode = new Map((skills ?? []).map((s) => [s.code as string, (s.name as string | null) ?? ""]));
    const missingSkills = allSkillCodes.filter((c) => !skillNameByCode.has(c));
    if (missingSkills.length > 0) {
      return NextResponse.json({ error: "SKILL_CODE_NOT_FOUND", skill_codes: missingSkills }, { status: 400 });
    }

    const { data: tags, error: tErr } = await supabase
      .from("video_skill_tags")
      .select("id, video_id, skill_code")
      .in("video_id", videoIds)
      .limit(20000);
    if (tErr) throw tErr;

    const existingByVideo = new Map<string, Map<string, string>>();
    (tags ?? []).forEach((t) => {
      const vid = t.video_id as string;
      const code = (t.skill_code as string).toUpperCase();
      const id = t.id as string;
      const cur = existingByVideo.get(vid) ?? new Map<string, string>();
      cur.set(code, id);
      existingByVideo.set(vid, cur);
    });

    const toInsert: Array<{ video_id: string; skill_code: string; skill_name: string }> = [];
    const toDeleteIds: string[] = [];

    updates.forEach((u) => {
      const desired = new Set(u.skill_codes.map((c) => c.toUpperCase()));
      const existing = existingByVideo.get(u.video_id) ?? new Map<string, string>();

      desired.forEach((code) => {
        if (existing.has(code)) return;
        const name = (skillNameByCode.get(code) ?? "").trim();
        toInsert.push({ video_id: u.video_id, skill_code: code, skill_name: name || code });
      });

      existing.forEach((tagId, code) => {
        if (!desired.has(code)) toDeleteIds.push(tagId);
      });
    });

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("video_skill_tags").insert(toInsert);
      if (insErr) throw insErr;
    }

    if (toDeleteIds.length > 0) {
      const { error: delErr } = await supabase.from("video_skill_tags").delete().in("id", toDeleteIds);
      if (delErr) throw delErr;
    }

    return NextResponse.json({
      ok: true,
      updated_videos: updates.length,
      added: toInsert.length,
      removed: toDeleteIds.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "BATCH_UPDATE_FAILED", detail: msg }, { status: 500 });
  }
}

