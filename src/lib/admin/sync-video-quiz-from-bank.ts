import type { SupabaseClient } from "@supabase/supabase-js";
import { looksLikePlaceholderQuizQuestion } from "@/lib/exam3-video-quiz-guards";

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

/**
 * 以「已核准入庫」且帶有 video_id 的 question_bank_items 隨機抽 3 筆，同步該影片的 quizzes／quiz_questions。
 * 僅影響該 video_id；第二次段考題庫列通常無 video_id，不會被掃入。
 */
export async function syncVideoComprehensionQuizFromBank(
  supabase: SupabaseClient,
  videoId: string,
): Promise<{ ok: boolean; reason?: string; quizId?: string }> {
  const { data: rows, error: selErr } = await supabase
    .from("question_bank_items")
    .select(
      "id, unit, skill_code, difficulty, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation",
    )
    .eq("video_id", videoId)
    .order("created_at", { ascending: true })
    .limit(80);
  if (selErr) throw selErr;

  const bank = (rows ?? []).filter(
    (r) =>
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

  const pool = [...bank];
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

  const qRows = three.map((r, idx) => ({
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

  const { error: insErr } = await supabase.from("quiz_questions").insert(qRows);
  if (insErr) throw insErr;

  return { ok: true, quizId };
}
