import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

type Params = { id: string };

export async function DELETE(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "MISSING_ID" }, { status: 400 });

  try {
    const supabase = getSupabaseAdmin();

    const { data: existed, error: exErr } = await supabase
      .from("video_skill_tags")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (exErr) throw exErr;
    if (!existed) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const { error } = await supabase.from("video_skill_tags").delete().eq("id", id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "DELETE_FAILED", detail: msg }, { status: 500 });
  }
}

