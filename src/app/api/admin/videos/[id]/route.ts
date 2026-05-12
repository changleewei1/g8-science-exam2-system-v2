import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

const patchBodySchema = z.object({
  title: z.string().min(1).optional(),
  sort_order: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
  management_status: z.enum(["draft", "pending_review", "active"]).optional(),
  subtitle_text: z.string().optional().nullable(),
});

type Params = { id: string };

export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = patchBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) patch.title = parsed.data.title;
  if (parsed.data.sort_order !== undefined) patch.sort_order = parsed.data.sort_order;
  if (parsed.data.is_active !== undefined) patch.is_active = parsed.data.is_active;
  if (parsed.data.management_status !== undefined) patch.management_status = parsed.data.management_status;
  if (parsed.data.subtitle_text !== undefined) patch.subtitle_text = parsed.data.subtitle_text;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "EMPTY_PATCH" }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("videos").update(patch).eq("id", id).select("*").maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, video: data });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "UPDATE_FAILED", detail: msg }, { status: 500 });
  }
}

/** 軟封存：不刪資料列，避免影響進度／測驗外鍵 */
export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await ctx.params;

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("videos")
      .update({
        is_active: false,
        management_status: "draft",
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ ok: true, archived: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "ARCHIVE_FAILED", detail: msg }, { status: 500 });
  }
}
