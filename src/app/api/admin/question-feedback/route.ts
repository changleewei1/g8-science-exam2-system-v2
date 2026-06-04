import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 老師端：題目品質統計列表 */
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status")?.trim();
  const issue = searchParams.get("issue")?.trim();
  const examScopeId = searchParams.get("examScopeId")?.trim();
  const unitId = searchParams.get("unitId")?.trim();
  const videoId = searchParams.get("videoId")?.trim();
  const skillCode = searchParams.get("skillCode")?.trim();

  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("question_quality_stats")
    .select(
      "question_id, helpful_count, not_related_count, confusing_count, wrong_answer_count, bad_explanation_count, total_feedback_count, quality_score, ai_confidence_score, review_priority_score, review_status, last_feedback_at, updated_at",
    )
    .order("review_priority_score", { ascending: false })
    .limit(400);

  if (status && ["normal", "needs_review", "hidden", "approved", "regenerated"].includes(status)) {
    query = query.eq("review_status", status);
  }
  if (issue === "not_related") {
    query = query.gte("not_related_count", 1);
  } else if (issue === "wrong_answer") {
    query = query.gte("wrong_answer_count", 1);
  } else if (issue === "confusing") {
    query = query.gte("confusing_count", 1);
  } else if (issue === "bad_explanation") {
    query = query.gte("bad_explanation_count", 1);
  }

  const { data: statsRows, error } = await query;
  if (error) {
    return NextResponse.json({ error: "QUERY_FAILED", detail: error.message }, { status: 500 });
  }

  const ids = (statsRows ?? []).map((r) => (r as { question_id: string }).question_id).filter(Boolean);
  let bankById = new Map<string, Record<string, unknown>>();
  let videoById = new Map<string, { title: string }>();
  let feedbackByQuestion = new Map<
    string,
    Array<{
      id: string;
      feedback_type: string;
      comment: string | null;
      created_at: string;
    }>
  >();
  if (ids.length > 0) {
    const { data: fbRows, error: fbErr } = await supabase
      .from("question_feedback")
      .select("id, question_id, feedback_type, comment, created_at")
      .in("question_id", ids)
      .order("created_at", { ascending: false })
      .limit(1200);
    if (fbErr) {
      return NextResponse.json({ error: "FEEDBACK_QUERY_FAILED", detail: fbErr.message }, { status: 500 });
    }
    for (const row of fbRows ?? []) {
      const r = row as {
        id: string;
        question_id: string;
        feedback_type: string;
        comment: string | null;
        created_at: string;
      };
      const list = feedbackByQuestion.get(r.question_id) ?? [];
      if (list.length < 12) list.push(r);
      feedbackByQuestion.set(r.question_id, list);
    }
  }

  if (ids.length > 0) {
    const { data: bankRows, error: bErr } = await supabase
      .from("question_bank_items")
      .select("id, question_text, skill_code, video_id, exam_scope_id, unit")
      .in("id", ids);
    if (bErr) {
      return NextResponse.json({ error: "BANK_QUERY_FAILED", detail: bErr.message }, { status: 500 });
    }
    bankById = new Map((bankRows ?? []).map((b) => [(b as { id: string }).id, b as Record<string, unknown>]));
    const vids = [...new Set((bankRows ?? []).map((b) => (b as { video_id: string | null }).video_id).filter(Boolean))] as string[];
    if (vids.length > 0) {
      const { data: vrows } = await supabase.from("videos").select("id, title").in("id", vids);
      for (const v of vrows ?? []) {
        const row = v as { id: string; title: string };
        videoById.set(row.id, { title: row.title });
      }
    }
  }

  const items = (statsRows ?? []).map((row) => {
    const r = row as {
      question_id: string;
      helpful_count: number;
      not_related_count: number;
      confusing_count: number;
      wrong_answer_count: number;
      bad_explanation_count: number;
      total_feedback_count: number;
      quality_score: number;
      ai_confidence_score: number;
      review_priority_score: number;
      review_status: string;
      last_feedback_at: string | null;
      updated_at: string;
    };
    return {
      ...r,
      bank: bankById.get(r.question_id) ?? null,
      videoTitle: (() => {
        const b = bankById.get(r.question_id);
        const vid = b?.video_id as string | null | undefined;
        if (!vid) return null;
        return videoById.get(vid)?.title ?? null;
      })(),
      recentFeedback: feedbackByQuestion.get(r.question_id) ?? [],
    };
  });

  const filtered = items.filter((it) => {
    const b = it.bank;
    if (examScopeId && String(b?.exam_scope_id ?? "") !== examScopeId) return false;
    if (skillCode && String(b?.skill_code ?? "").trim() !== skillCode) return false;
    if (videoId && String(b?.video_id ?? "") !== videoId) return false;
    return true;
  });

  let out = filtered;
  if (unitId && unitId.length > 0) {
    const { data: unitRow } = await supabase.from("scope_units").select("unit_title").eq("id", unitId).maybeSingle();
    const ut = (unitRow?.unit_title as string | undefined)?.trim();
    if (ut) {
      out = filtered.filter((it) => {
        const b = it.bank;
        if (!b) return false;
        return String(b.unit ?? "") === ut;
      });
    }
  }

  return NextResponse.json({ items: out });
}
