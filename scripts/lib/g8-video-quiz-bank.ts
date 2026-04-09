/**
 * 與 seed:g8-video-quiz 共用：從題庫配選項推導影片小考題目。
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";

export type BankQuestion = {
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

export function loadBankFromFile(): BankQuestion[] {
  const path = join(process.cwd(), JSON_PATH);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as BankQuestion[];
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
    excluded_from_video_quiz_pool?: boolean | null;
  }>,
): BankQuestion[] {
  return rows
    .filter((r) => !r.excluded_from_video_quiz_pool)
    .map((r) => ({
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

export async function loadQuestionBank(supabase: SupabaseClient): Promise<BankQuestion[]> {
  const { data: fromDb, error } = await supabase
    .from("question_bank_items")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  if (fromDb?.length) {
    return rowsToBank(fromDb);
  }
  return loadBankFromFile();
}

export function pickQuestionsForQuiz(
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
