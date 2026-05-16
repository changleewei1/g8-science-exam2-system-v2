import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

type Params = { id: string };

const patchSchema = z.object({
  action: z.enum(["update", "approve", "reject"]).optional(),
  question_text: z.string().min(1).optional(),
  choice_a: z.string().min(1).optional(),
  choice_b: z.string().min(1).optional(),
  choice_c: z.string().min(1).optional(),
  choice_d: z.string().min(1).optional(),
  correct_answer: z.enum(["A", "B", "C", "D"]).optional(),
  explanation: z.string().nullable().optional(),
  difficulty: z.enum(["基礎", "進階"]).optional(),
});

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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const explicit = parsed.data.action;
  const wantsUpdateFields =
    parsed.data.question_text !== undefined ||
    parsed.data.choice_a !== undefined ||
    parsed.data.choice_b !== undefined ||
    parsed.data.choice_c !== undefined ||
    parsed.data.choice_d !== undefined ||
    parsed.data.correct_answer !== undefined ||
    parsed.data.explanation !== undefined ||
    parsed.data.difficulty !== undefined;
  const action = explicit ?? (wantsUpdateFields ? "update" : undefined);

  try {
    const supabase = getSupabaseAdmin();
    const { data: row, error: fErr } = await supabase
      .from("generated_question_candidates")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (fErr) throw fErr;
    if (!row) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    if (row.status !== "draft" && (action === "approve" || action === "reject")) {
      return NextResponse.json({ error: "NOT_EDITABLE_STATE" }, { status: 409 });
    }

    if (action === "reject") {
      const { error } = await supabase
        .from("generated_question_candidates")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "rejected" });
    }

    if (action === "update" || wantsUpdateFields) {
      if (row.status !== "draft") {
        return NextResponse.json({ error: "ONLY_DRAFT_EDITABLE" }, { status: 409 });
      }
      const patch: Record<string, unknown> = {};
      const p = parsed.data;
      if (p.question_text !== undefined) patch.question_text = p.question_text;
      if (p.choice_a !== undefined) patch.choice_a = p.choice_a;
      if (p.choice_b !== undefined) patch.choice_b = p.choice_b;
      if (p.choice_c !== undefined) patch.choice_c = p.choice_c;
      if (p.choice_d !== undefined) patch.choice_d = p.choice_d;
      if (p.correct_answer !== undefined) patch.correct_answer = p.correct_answer;
      if (p.explanation !== undefined) patch.explanation = p.explanation;
      if (p.difficulty !== undefined) patch.difficulty = p.difficulty;
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "EMPTY_UPDATE" }, { status: 400 });
      }
      const { error } = await supabase.from("generated_question_candidates").update(patch).eq("id", id);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "updated" });
    }

    if (action !== "approve") {
      return NextResponse.json({ error: "MISSING_ACTION", message: "請傳 action: approve | reject 或帶入要修改的欄位。" }, { status: 400 });
    }

    // approve
    const qt = row.question_text as string;
    const scInsert = String(row.skill_code ?? "").trim();
    const videoId = String(row.video_id ?? "").trim();

    let dupQ = supabase.from("question_bank_items").select("id").eq("skill_code", scInsert).eq("question_text", qt);
    if (videoId) dupQ = dupQ.eq("video_id", videoId);
    else dupQ = dupQ.is("video_id", null);
    const { data: dup, error: dErr } = await dupQ.limit(1);
    if (dErr) throw dErr;
    if ((dup ?? []).length > 0) {
      return NextResponse.json(
        { error: "DUPLICATE_IN_BANK", message: "題庫已存在相同影片（或共用題庫）之相同題文，將不會重複寫入。" },
        { status: 409 },
      );
    }

    let nextOrder = 1;
    if (videoId) {
      const { data: maxRow } = await supabase
        .from("question_bank_items")
        .select("sort_order")
        .eq("video_id", videoId)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      nextOrder = Number(maxRow?.sort_order ?? 0) + 1;
    } else {
      const { data: maxRow } = await supabase
        .from("question_bank_items")
        .select("sort_order")
        .eq("skill_code", scInsert)
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      nextOrder = Number(maxRow?.sort_order ?? 0) + 1;
    }

    let examScopeId = (row.exam_scope_id as string | null) ?? null;
    if (!examScopeId && videoId) {
      const { data: vjoin } = await supabase.from("videos").select("unit_id").eq("id", videoId).maybeSingle();
      if (vjoin?.unit_id) {
        const { data: su } = await supabase
          .from("scope_units")
          .select("exam_scope_id")
          .eq("id", vjoin.unit_id as string)
          .maybeSingle();
        examScopeId = (su?.exam_scope_id as string | null) ?? null;
      }
    }

    const bankInsert: Record<string, unknown> = {
      unit: row.unit as string,
      skill_code: scInsert,
      difficulty: (row.difficulty as string) || "基礎",
      question_text: qt,
      choice_a: row.choice_a as string,
      choice_b: row.choice_b as string,
      choice_c: row.choice_c as string,
      choice_d: row.choice_d as string,
      correct_answer: String(row.correct_answer ?? "").trim().toUpperCase(),
      explanation: row.explanation as string | null,
      sort_order: nextOrder,
      source_key: `admin_video_candidate:${row.id}:${row.video_id}`,
      question_type: "single_choice",
    };
    if (videoId) bankInsert.video_id = videoId;
    if (examScopeId) bankInsert.exam_scope_id = examScopeId;

    const { data: insRow, error: insErr } = await supabase
      .from("question_bank_items")
      .insert(bankInsert)
      .select("id")
      .single();
    if (insErr) throw insErr;

    const { error: upErr } = await supabase
      .from("generated_question_candidates")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        promoted_bank_item_id: insRow?.id ?? null,
      })
      .eq("id", id);
    if (upErr) throw upErr;

    let quizSynced: { ok: boolean; reason?: string; quizId?: string } | null = null;
    if (videoId) {
      const { syncVideoComprehensionQuizFromBank } = await import("@/lib/admin/sync-video-quiz-from-bank");
      quizSynced = await syncVideoComprehensionQuizFromBank(supabase, videoId);
    }

    return NextResponse.json({
      ok: true,
      status: "approved",
      bank_item_id: insRow?.id ?? null,
      quiz_sync: quizSynced,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "PATCH_FAILED", detail: msg }, { status: 500 });
  }
}
