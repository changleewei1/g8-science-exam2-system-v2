import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  reviewStatus: z.enum(["normal", "needs_review", "hidden", "approved", "regenerated"]),
});

type Params = { questionId: string };

export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { questionId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("question_quality_stats")
    .select("question_id")
    .eq("question_id", questionId)
    .maybeSingle();

  if (!existing) {
    const { error: insErr } = await supabase.from("question_quality_stats").insert({
      question_id: questionId,
      helpful_count: 0,
      not_related_count: 0,
      confusing_count: 0,
      wrong_answer_count: 0,
      bad_explanation_count: 0,
      total_feedback_count: 0,
      quality_score: 100,
      ai_confidence_score: 100,
      review_priority_score: 0,
      review_status: parsed.data.reviewStatus,
      updated_at: new Date().toISOString(),
    });
    if (insErr) {
      return NextResponse.json({ error: "INSERT_FAILED", detail: insErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase
    .from("question_quality_stats")
    .update({
      review_status: parsed.data.reviewStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("question_id", questionId);
  if (error) {
    return NextResponse.json({ error: "UPDATE_FAILED", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
