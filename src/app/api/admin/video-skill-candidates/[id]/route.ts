import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

const patchBodySchema = z
  .object({
    action: z.enum(["approve", "reject", "approve_with_skill_code"]),
    skill_code: z.string().min(1).max(32).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.action === "approve_with_skill_code" && !v.skill_code) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["skill_code"],
        message: "approve_with_skill_code 需要 skill_code",
      });
    }
  });

type Params = { id: string };

async function resolveVideoUuid(rawVideoId: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data: byUuid } = await supabase
    .from("videos")
    .select("id")
    .eq("id", rawVideoId)
    .maybeSingle();
  if (byUuid?.id) return byUuid.id;
  const { data: byYoutube } = await supabase
    .from("videos")
    .select("id")
    .eq("youtube_video_id", rawVideoId)
    .maybeSingle();
  return byYoutube?.id ?? null;
}

export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: candidate, error: cErr } = await supabase
    .from("video_skill_mapping_candidates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!candidate) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  if (candidate.status !== "pending") {
    return NextResponse.json({ error: "ALREADY_REVIEWED" }, { status: 409 });
  }

  const action = parsed.data.action;
  if (action === "reject") {
    const { error } = await supabase
      .from("video_skill_mapping_candidates")
      .update({
        status: "rejected",
        reviewed_by: "admin",
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  const finalSkillCode = (action === "approve_with_skill_code"
    ? parsed.data.skill_code
    : candidate.suggested_skill_code
  )!
    .trim()
    .toUpperCase();

  const { data: skillTag, error: skillErr } = await supabase
    .from("skill_tags")
    .select("code, name")
    .eq("code", finalSkillCode)
    .maybeSingle();
  if (skillErr) return NextResponse.json({ error: skillErr.message }, { status: 500 });
  if (!skillTag) return NextResponse.json({ error: "SKILL_CODE_NOT_FOUND" }, { status: 400 });

  const videoUuid = await resolveVideoUuid(candidate.video_id);
  if (!videoUuid) return NextResponse.json({ error: "VIDEO_NOT_FOUND" }, { status: 400 });

  const { data: existed, error: exErr } = await supabase
    .from("video_skill_tags")
    .select("id")
    .eq("video_id", videoUuid)
    .eq("skill_code", finalSkillCode)
    .maybeSingle();
  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });

  if (!existed) {
    const { error: insErr } = await supabase.from("video_skill_tags").insert({
      video_id: videoUuid,
      skill_code: finalSkillCode,
      skill_name: skillTag.name || finalSkillCode,
    });
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  const { error: upErr } = await supabase
    .from("video_skill_mapping_candidates")
    .update({
      status: "approved",
      suggested_skill_code: finalSkillCode,
      suggested_skill_name: skillTag.name || finalSkillCode,
      reviewed_by: "admin",
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, status: "approved", inserted_video_skill_tag: !existed });
}
