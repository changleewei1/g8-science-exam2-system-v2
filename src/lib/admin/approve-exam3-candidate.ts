import type { SupabaseClient } from "@supabase/supabase-js";
import { looksLikePlaceholderQuizQuestion } from "@/lib/exam3-video-quiz-guards";
import { syncVideoComprehensionQuizFromBank } from "@/lib/admin/sync-video-quiz-from-bank";

type CandidateRow = {
  id: string;
  video_id: string | null;
  unit: string;
  skill_code: string;
  difficulty: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  exam_scope_id: string | null;
  status: string;
};

function isPlaceholderCandidate(row: CandidateRow): boolean {
  return looksLikePlaceholderQuizQuestion({
    questionText: String(row.question_text ?? ""),
    choiceA: String(row.choice_a ?? ""),
    choiceB: String(row.choice_b ?? ""),
    choiceC: String(row.choice_c ?? ""),
    choiceD: String(row.choice_d ?? ""),
  });
}

/** 核准單筆 draft 候選題 → 寫入 question_bank_items */
export async function approveExam3CandidateById(
  supabase: SupabaseClient,
  candidateId: string,
): Promise<
  | { ok: true; bankItemId: string; quizSync: { ok: boolean; reason?: string; quizId?: string } | null }
  | { ok: false; error: string; message: string }
> {
  const { data: row, error: fErr } = await supabase
    .from("generated_question_candidates")
    .select("*")
    .eq("id", candidateId)
    .maybeSingle();
  if (fErr) throw fErr;
  if (!row) return { ok: false, error: "NOT_FOUND", message: "找不到候選題" };
  const c = row as CandidateRow;
  if (c.status !== "draft") {
    return { ok: false, error: "NOT_EDITABLE_STATE", message: "僅 draft 可核准" };
  }
  if (isPlaceholderCandidate(c)) {
    return { ok: false, error: "PLACEHOLDER", message: "占位題不可核准" };
  }

  const qt = c.question_text;
  const scInsert = String(c.skill_code ?? "").trim();
  const videoId = String(c.video_id ?? "").trim();
  if (!videoId) {
    return { ok: false, error: "NO_VIDEO", message: "候選題未綁定影片" };
  }

  let dupQ = supabase.from("question_bank_items").select("id").eq("skill_code", scInsert).eq("question_text", qt);
  dupQ = dupQ.eq("video_id", videoId);
  const { data: dup, error: dErr } = await dupQ.limit(1);
  if (dErr) throw dErr;
  if ((dup ?? []).length > 0) {
    await supabase
      .from("generated_question_candidates")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        promoted_bank_item_id: dup[0].id as string,
      })
      .eq("id", candidateId);
    const quizSync = await syncVideoComprehensionQuizFromBank(supabase, videoId);
    return { ok: true, bankItemId: dup[0].id as string, quizSync };
  }

  const { data: maxRow } = await supabase
    .from("question_bank_items")
    .select("sort_order")
    .eq("video_id", videoId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = Number(maxRow?.sort_order ?? 0) + 1;

  let examScopeId = (c.exam_scope_id as string | null) ?? null;
  if (!examScopeId) {
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
    unit: c.unit,
    skill_code: scInsert,
    difficulty: c.difficulty || "基礎",
    question_text: qt,
    choice_a: c.choice_a,
    choice_b: c.choice_b,
    choice_c: c.choice_c,
    choice_d: c.choice_d,
    correct_answer: String(c.correct_answer ?? "")
      .trim()
      .toUpperCase()
      .charAt(0),
    explanation: c.explanation,
    sort_order: nextOrder,
    source_key: `approve_exam3:${candidateId}:${videoId}`,
    question_type: "single_choice",
    video_id: videoId,
  };
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
    .eq("id", candidateId);
  if (upErr) throw upErr;

  const quizSync = await syncVideoComprehensionQuizFromBank(supabase, videoId);
  return { ok: true, bankItemId: insRow?.id as string, quizSync };
}

export async function countRealExam3BankItems(
  supabase: SupabaseClient,
  videoId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("question_bank_items")
    .select("question_text, choice_a, choice_b, choice_c, choice_d")
    .eq("video_id", videoId);
  if (error) throw error;
  return (data ?? []).filter(
    (r) =>
      !looksLikePlaceholderQuizQuestion({
        questionText: String(r.question_text ?? ""),
        choiceA: String(r.choice_a ?? ""),
        choiceB: String(r.choice_b ?? ""),
        choiceC: String(r.choice_c ?? ""),
        choiceD: String(r.choice_d ?? ""),
      }),
  ).length;
}

/** 為單支影片核准 draft（最多補滿 3 題真題庫），並嘗試同步測驗 */
export async function approveExam3DraftsForVideo(
  supabase: SupabaseClient,
  videoId: string,
  maxTotal = 3,
): Promise<{ approved: number; bankCount: number; synced: boolean; skippedPlaceholder: number }> {
  let bankCount = await countRealExam3BankItems(supabase, videoId);
  if (bankCount >= maxTotal) {
    const sync = await syncVideoComprehensionQuizFromBank(supabase, videoId);
    return { approved: 0, bankCount, synced: sync.ok, skippedPlaceholder: 0 };
  }

  const { data: drafts, error } = await supabase
    .from("generated_question_candidates")
    .select("*")
    .eq("video_id", videoId)
    .eq("status", "draft")
    .order("created_at", { ascending: true });
  if (error) throw error;

  let approved = 0;
  let skippedPlaceholder = 0;

  for (const raw of drafts ?? []) {
    if (bankCount >= maxTotal) break;
    const c = raw as CandidateRow;
    if (isPlaceholderCandidate(c)) {
      skippedPlaceholder += 1;
      continue;
    }
    const r = await approveExam3CandidateById(supabase, c.id);
    if (r.ok) {
      approved += 1;
      bankCount = await countRealExam3BankItems(supabase, videoId);
    }
  }

  const sync =
    bankCount >= maxTotal ? await syncVideoComprehensionQuizFromBank(supabase, videoId) : { ok: false };
  return { approved, bankCount, synced: sync.ok, skippedPlaceholder };
}
