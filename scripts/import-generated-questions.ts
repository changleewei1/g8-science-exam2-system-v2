/**
 * 匯入 AI 生成題目到 question_bank_items（預設 dry-run）
 *
 * 用法：
 *   npm run import:generated-questions -- --input data/generated_questions.json
 *   npm run import:generated-questions -- --input data/generated_questions.json --apply
 *   npm run import:generated-questions -- --input data/generated_questions.json --skill-code RS06 --apply
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

type GeneratedQuestion = {
  unit: string;
  skill_code: string;
  difficulty: "基礎" | "進階";
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  video_id?: string;
};

type Envelope = {
  items: GeneratedQuestion[];
};

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。、「」；：！？,.!?:;"'()（）\[\]{}]/g, "");
}

function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const aSet = new Set(na.match(/.{1,2}/g) ?? []);
  const bSet = new Set(nb.match(/.{1,2}/g) ?? []);
  if (!aSet.size || !bSet.size) return 0;
  let inter = 0;
  for (const g of aSet) if (bSet.has(g)) inter += 1;
  return inter / Math.max(aSet.size, bSet.size);
}

function loadInput(pathArg: string): GeneratedQuestion[] {
  const path = join(process.cwd(), pathArg);
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as Envelope | GeneratedQuestion[];
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items)) throw new Error("輸入 JSON 格式錯誤，需含 items 陣列");
  return items;
}

async function main() {
  const input = getArg("--input")?.trim() || "data/generated_questions.json";
  const apply = process.argv.includes("--apply");
  const onlySkill = getArg("--skill-code")?.trim().toUpperCase();

  const allItems = loadInput(input);
  const items = onlySkill ? allItems.filter((q) => q.skill_code.toUpperCase() === onlySkill) : allItems;
  if (!items.length) {
    console.log("沒有可匯入題目（可能被 --skill-code 篩掉）");
    return;
  }

  const supabase = getSupabaseAdmin();
  const { data: existing, error: eErr } = await supabase
    .from("question_bank_items")
    .select("question_text, skill_code");
  if (eErr) throw eErr;

  let insertCount = 0;
  let skipCount = 0;
  const rows: Array<Record<string, unknown>> = [];

  for (const q of items) {
    const dup = (existing ?? []).some(
      (e) =>
        e.skill_code.toUpperCase() === q.skill_code.toUpperCase() &&
        similarity(e.question_text, q.question_text) >= 0.82,
    );
    if (dup) {
      skipCount += 1;
      continue;
    }

    rows.push({
      unit: q.unit,
      skill_code: q.skill_code.toUpperCase(),
      difficulty: q.difficulty === "進階" ? "進階" : "基礎",
      question_text: q.question_text,
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      choice_c: q.choice_c,
      choice_d: q.choice_d,
      correct_answer: q.correct_answer,
      explanation: `${q.explanation}${q.video_id ? `\n\n[來源影片ID] ${q.video_id}` : ""}`,
      source_key: q.video_id ? `ai_gen:${q.video_id}:${Date.now()}` : `ai_gen:${Date.now()}`,
    });
    insertCount += 1;
  }

  console.log(`[DRY-RUN=${apply ? "OFF" : "ON"}] 可新增 ${insertCount} 題，重複略過 ${skipCount} 題`);
  if (!apply || rows.length === 0) return;

  const { error: insErr } = await supabase.from("question_bank_items").insert(rows);
  if (insErr) throw insErr;
  console.log(`已寫入 ${rows.length} 題到 question_bank_items`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
