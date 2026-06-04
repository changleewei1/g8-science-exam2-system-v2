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
  const { data: revs, error } = await supabase
    .from("question_bank_item_revisions")
    .select("id, version, previous_version, change_reason, edited_at, editor_label")
    .eq("question_id", questionId)
    .order("edited_at", { ascending: false })
    .limit(80);
  if (error) {
    return NextResponse.json({ error: "QUERY_FAILED", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ revisions: revs ?? [] });
}
