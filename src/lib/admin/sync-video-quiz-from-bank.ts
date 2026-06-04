import type { SupabaseClient } from "@supabase/supabase-js";
import { looksLikePlaceholderQuizQuestion } from "@/lib/exam3-video-quiz-guards";
import { compareBankRowsForQuestionPool, isHiddenOrLowQuality } from "@/lib/question-quality/bank-pool-sort";

function shuffleInPlace<T>(arr: T[]) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function normalizeCorrectLetter(raw: unknown): "A" | "B" | "C" | "D" {
  const c = String(raw ?? "")
    .trim()
    .toUpperCase()
    .charAt(0);
  return c === "B" || c === "C" || c === "D" ? c : "A";
}

/** 盡量讓三題的正解字母分散（A/B/C 優先各一題），再補滿至 3 題 */
function pickThreeWithSpreadCorrectLetters<T extends { id: string; correct_answer?: unknown }>(
  rows: T[],
): T[] {
  if (rows.length <= 3) return [...rows];
  const pool = [...rows];
  shuffleInPlace(pool);
  const chosen: T[] = [];
  const used = new Set<string>();
  for (const want of ["A", "B", "C"] as const) {
    const hit = pool.find((r) => !used.has(r.id) && normalizeCorrectLetter(r.correct_answer) === want);
    if (hit) {
      chosen.push(hit);
      used.add(hit.id);
    }
  }
  for (const r of pool) {
    if (chosen.length >= 3) break;
    if (!used.has(r.id)) {
      chosen.push(r);
      used.add(r.id);
    }
  }
  return chosen.slice(0, 3);
}

type BankRow = {
  id: string;
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
  excluded_from_video_quiz_pool?: boolean | null;
};

type QualityRow = {
  question_id: string;
  helpful_count: number;
  quality_score: number;
  review_status: string;
  not_related_count?: number | null;
  confusing_count?: number | null;
  wrong_answer_count?: number | null;
  bad_explanation_count?: number | null;
};

/**
 * 以「已核准入庫」且帶有 video_id 的 question_bank_items 抽 3 筆，同步該影片的 quizzes／quiz_questions。
 * 排除 placeholder、軟排除、品質隱藏／低分題；優先高分與與影片 skill 對應者。
 */
export async function syncVideoComprehensionQuizFromBank(
  supabase: SupabaseClient,
  videoId: string,
): Promise<{ ok: boolean; reason?: string; quizId?: string }> {
  const selectWithExcluded =
    "id, unit, skill_code, difficulty, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation, excluded_from_video_quiz_pool";
  const selectMin =
    "id, unit, skill_code, difficulty, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation";

  const first = await supabase
    .from("question_bank_items")
    .select(selectWithExcluded)
    .eq("video_id", videoId)
    .order("created_at", { ascending: true })
    .limit(120);

  let rows = first.data as unknown[] | null;
  let selErr = first.error;

  if (
    selErr &&
    (selErr.code === "42703" ||
      /excluded_from_video_quiz_pool|column .* does not exist/i.test(String(selErr.message ?? "")))
  ) {
    const second = await supabase
      .from("question_bank_items")
      .select(selectMin)
      .eq("video_id", videoId)
      .order("created_at", { ascending: true })
      .limit(120);
    rows = second.data as unknown[] | null;
    selErr = second.error;
  }
  if (selErr) throw selErr;

  const bankRaw = (rows ?? []) as BankRow[];
  const bank = bankRaw.filter(
    (r) =>
      !(r.excluded_from_video_quiz_pool === true) &&
      !looksLikePlaceholderQuizQuestion({
        questionText: String(r.question_text ?? ""),
        choiceA: String(r.choice_a ?? ""),
        choiceB: String(r.choice_b ?? ""),
        choiceC: String(r.choice_c ?? ""),
        choiceD: String(r.choice_d ?? ""),
      }),
  );
  if (bank.length < 3) {
    return { ok: false, reason: "NEED_THREE_BANK_ITEMS" };
  }

  const ids = bank.map((r) => r.id);
  /** 未套用品質相關 migration 時略過（避免 42P01 / PGRST 等導致影片頁崩潰） */
  let qMap = new Map<string, QualityRow>();
  const { data: qRows, error: qStatErr } = await supabase
    .from("question_quality_stats")
    .select(
      "question_id, helpful_count, quality_score, review_status, not_related_count, confusing_count, wrong_answer_count, bad_explanation_count",
    )
    .in("question_id", ids);
  if (!qStatErr && qRows) {
    qMap = new Map<string, QualityRow>(
      qRows.map((s) => {
        const row = s as QualityRow;
        return [row.question_id, row];
      }),
    );
  }

  const eligible = bank.filter((r) => {
    const st = qMap.get(r.id);
    return !isHiddenOrLowQuality(st);
  });
  if (eligible.length < 3) {
    return { ok: false, reason: "NEED_THREE_BANK_ITEMS" };
  }

  const { data: tagRows } = await supabase.from("video_skill_tags").select("skill_code").eq("video_id", videoId);
  const skillSet = new Set((tagRows ?? []).map((t) => (t as { skill_code: string }).skill_code));

  const pool = [...eligible];
  pool.sort((a, b) => compareBankRowsForQuestionPool(a, b, skillSet, qMap));

  const three = pickThreeWithSpreadCorrectLetters(pool);

  const { data: existingQuiz, error: qFindErr } = await supabase
    .from("quizzes")
    .select("id")
    .eq("video_id", videoId)
    .maybeSingle();
  if (qFindErr) throw qFindErr;

  let quizId = existingQuiz?.id as string | undefined;
  if (!quizId) {
    const { data: insQ, error: insQErr } = await supabase
      .from("quizzes")
      .insert({
        video_id: videoId,
        title: "影片理解測驗",
        description: "依字幕與技能樹審核之題目；答對 2 題以上通過",
        pass_score: 2,
        question_count: 3,
        is_active: true,
      })
      .select("id")
      .single();
    if (insQErr) throw insQErr;
    quizId = insQ?.id as string;
  }

  const { error: delErr } = await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
  if (delErr) throw delErr;

  const baseRows = three.map((r, idx) => ({
    quiz_id: quizId,
    question_text: r.question_text as string,
    question_type: "mcq",
    choice_a: r.choice_a as string,
    choice_b: r.choice_b as string,
    choice_c: r.choice_c as string,
    choice_d: r.choice_d as string,
    correct_answer: String(r.correct_answer ?? "")
      .trim()
      .toUpperCase()
      .charAt(0),
    explanation: (r.explanation as string | null) ?? null,
    sort_order: idx,
    difficulty: (r.difficulty as string | null) ?? null,
    skill_code: String(r.skill_code ?? "").trim(),
  }));

  const withBankId = baseRows.map((row, idx) => ({
    ...row,
    question_bank_item_id: three[idx]!.id,
  }));

  let insErr = (await supabase.from("quiz_questions").insert(withBankId)).error;
  /** 未套用 quiz_questions.question_bank_item_id 欄位時降級插入（42703 = undefined_column） */
  if (
    insErr &&
    (insErr.code === "42703" ||
      /question_bank_item_id|column.*does not exist/i.test(String(insErr.message ?? "")))
  ) {
    insErr = (await supabase.from("quiz_questions").insert(baseRows)).error;
  }
  if (insErr) throw insErr;

  return { ok: true, quizId };
}
