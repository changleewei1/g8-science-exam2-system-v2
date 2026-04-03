/**
 * 將 data/g8_science_exam2_question_bank.json 寫入 public.question_bank_items（全量取代）
 * 使用：npm run seed:g8-question-bank
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
  sort_order?: number;
  source_key?: string;
};

const DATA_FILE = "data/g8_science_exam2_question_bank.json";

function loadBank(): BankQuestion[] {
  const path = join(process.cwd(), DATA_FILE);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as BankQuestion[];
}

async function main() {
  const bank = loadBank();
  if (bank.length === 0) {
    console.error("題庫 JSON 為空");
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();

  const { error: delErr } = await supabase
    .from("question_bank_items")
    .delete()
    .neq("skill_code", "__never_match__");
  if (delErr) throw delErr;

  const rows = bank.map((q, idx) => ({
    unit: q.unit,
    skill_code: q.skill_code,
    difficulty: q.difficulty,
    question_text: q.question_text,
    choice_a: q.choice_a,
    choice_b: q.choice_b,
    choice_c: q.choice_c,
    choice_d: q.choice_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation ?? null,
    sort_order: q.sort_order ?? idx,
    source_key: q.source_key ?? null,
  }));

  const { error: insErr } = await supabase.from("question_bank_items").insert(rows);
  if (insErr) throw insErr;

  console.log(`完成：已寫入 ${rows.length} 筆題庫至 question_bank_items（來源 ${DATA_FILE}）。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
