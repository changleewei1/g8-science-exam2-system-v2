/**
 * 依 video_skill_tags 的 skill_code 優先匹配，為每個 quiz 寫入 3 題。
 * 題目來源：優先 public.question_bank_items；若為空則讀取 data/g8_science_exam2_question_bank.json
 * 使用：npm run seed:g8-video-quiz
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

type BankQuestion = {
  unit: string;
  skill_code: string;
  difficulty: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string;
};

const JSON_PATH = "data/g8_science_exam2_question_bank.json";

function loadBankFromFile(): BankQuestion[] {
  const path = join(process.cwd(), JSON_PATH);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as BankQuestion[];
}

function rowVideosEmbed(quiz: unknown): { sort_order: number } | null {
  if (!quiz || typeof quiz !== "object") return null;
  const v = (quiz as { videos?: unknown }).videos;
  if (!v) return null;
  if (Array.isArray(v) && v[0] && typeof v[0] === "object" && v[0] !== null && "sort_order" in v[0]) {
    return { sort_order: Number((v[0] as { sort_order: number }).sort_order) };
  }
  if (typeof v === "object" && v !== null && "sort_order" in v) {
    return { sort_order: Number((v as { sort_order: number }).sort_order) };
  }
  return null;
}

function pickQuestionsForQuiz(
  bank: BankQuestion[],
  skillCodesPriority: string[],
  count: number,
  rotation: number,
): BankQuestion[] {
  const n = bank.length;
  const used = new Set<number>();
  const result: BankQuestion[] = [];
  const rot = ((rotation % n) + n) % n;

  for (const code of skillCodesPriority) {
    if (result.length >= count) break;
    let idx = -1;
    for (let k = 0; k < n; k++) {
      const i = (rot + k) % n;
      if (!used.has(i) && bank[i].skill_code === code) {
        idx = i;
        break;
      }
    }
    if (idx >= 0) {
      used.add(idx);
      result.push(bank[idx]);
    }
  }

  const primaryUnit = result[0]?.unit;
  let scan = rot;
  while (result.length < count) {
    let found = -1;
    for (let k = 0; k < n; k++) {
      const i = (scan + k) % n;
      if (used.has(i)) continue;
      const q = bank[i];
      if (primaryUnit && q.unit !== primaryUnit) continue;
      found = i;
      break;
    }
    if (found < 0) {
      for (let k = 0; k < n; k++) {
        const i = (scan + k) % n;
        if (!used.has(i)) {
          found = i;
          break;
        }
      }
    }
    if (found < 0) break;
    used.add(found);
    result.push(bank[found]);
  }

  return result;
}

function rowsToBank(
  rows: Array<{
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
    sort_order: number;
  }>,
): BankQuestion[] {
  return rows.map((r) => ({
    unit: r.unit,
    skill_code: r.skill_code,
    difficulty: r.difficulty,
    question_text: r.question_text,
    choice_a: r.choice_a,
    choice_b: r.choice_b,
    choice_c: r.choice_c,
    choice_d: r.choice_d,
    correct_answer: r.correct_answer,
    explanation: r.explanation ?? "",
  }));
}

async function loadBank(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<BankQuestion[]> {
  const { data: fromDb, error } = await supabase
    .from("question_bank_items")
    .select(
      "unit, skill_code, difficulty, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation, sort_order",
    )
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (fromDb?.length) {
    console.log(`題目來源：question_bank_items（${fromDb.length} 筆）`);
    return rowsToBank(fromDb);
  }
  console.log(`question_bank_items 為空，改讀 ${JSON_PATH}`);
  return loadBankFromFile();
}

async function main() {
  const supabase = getSupabaseAdmin();
  const bank = await loadBank(supabase);
  if (bank.length === 0) {
    console.error("題庫為空，請先執行 npm run seed:g8-question-bank 或檢查 JSON。");
    process.exit(1);
  }

  const { data: quizzes, error: qErr } = await supabase
    .from("quizzes")
    .select("id, video_id, title, videos(sort_order)");
  if (qErr) throw qErr;
  if (!quizzes?.length) {
    console.log("沒有 quiz 資料，請先 npm run import:playlists。");
    return;
  }

  let updated = 0;
  for (const quiz of quizzes) {
    const embed = rowVideosEmbed(quiz);
    const sortOrder = embed?.sort_order ?? 0;

    const { data: tags, error: tErr } = await supabase
      .from("video_skill_tags")
      .select("skill_code")
      .eq("video_id", quiz.video_id)
      .order("created_at", { ascending: true });
    if (tErr) throw tErr;

    const priority = (tags ?? []).map((t) => t.skill_code);
    const picked = pickQuestionsForQuiz(bank, priority, 3, sortOrder);

    if (picked.length < 3) {
      console.warn(
        `[${quiz.title}] 題庫不足 3 題（僅 ${picked.length} 題），略過。請擴充題庫。`,
      );
      continue;
    }

    const { error: delErr } = await supabase.from("quiz_questions").delete().eq("quiz_id", quiz.id);
    if (delErr) throw delErr;

    const rows = picked.map((q, idx) => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      question_type: "mcq",
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      choice_c: q.choice_c,
      choice_d: q.choice_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      sort_order: idx,
      difficulty: q.difficulty,
      skill_code: q.skill_code,
    }));

    const { error: insErr } = await supabase.from("quiz_questions").insert(rows);
    if (insErr) throw insErr;

    updated += 1;
    console.log("OK:", quiz.title, "→", picked.map((p) => p.skill_code).join(", "));
  }

  console.log(`完成：已更新 ${updated} 份測驗（每份 3 題）。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
