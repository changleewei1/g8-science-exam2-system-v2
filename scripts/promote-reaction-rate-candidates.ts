/**
 * 將 reaction_rate_question_candidates（review_status = pending）提升到正式 question_bank_items。
 * 不觸及 quiz_questions；更新影片小題請之後再手動 npm run seed:g8-video-quiz。
 *
 * 使用：
 *   npm run promote:reaction-rate-candidates
 *   npm run promote:reaction-rate-candidates -- --apply
 *   npm run promote:reaction-rate-candidates -- --apply --limit=10
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { REACTION_RATE_BANK_UNIT_TITLE, isReactionRateSkillCode } from "./lib/reaction-rate-constants";

function parseArgs() {
  const argv = process.argv.slice(2);
  let limit: number | null = null;
  for (const a of argv) {
    if (a.startsWith("--limit=")) {
      limit = Math.max(1, parseInt(a.slice("--limit=".length), 10) || 0) || null;
    }
  }
  return {
    apply: argv.includes("--apply"),
    limit,
  };
}

async function main() {
  const { apply, limit } = parseArgs();
  const supabase = getSupabaseAdmin();

  let q = supabase
    .from("reaction_rate_question_candidates")
    .select("*")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });
  if (limit != null) {
    q = q.limit(limit);
  }
  const { data: pending, error } = await q;
  if (error) throw error;

  const rows = pending ?? [];
  console.log(`候選題 pending：${rows.length} 筆（${apply ? "將寫入 question_bank_items" : "DRY-RUN"}）`);

  if (!apply) {
    for (const r of rows) {
      const row = r as { id: string; skill_code: string; question_text: string };
      console.log(`  - ${row.id}  ${row.skill_code}  ${row.question_text.slice(0, 40)}…`);
    }
    console.log("\n加 --apply 以寫入正式題庫（仍不會改 quiz_questions）。");
    return;
  }

  let promoted = 0;
  for (const r of rows) {
    const c = r as {
      id: string;
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
      source_key: string | null;
    };
    if (!isReactionRateSkillCode(c.skill_code)) {
      console.warn(`略過候選 ${c.id}：skill_code 非 RS01–RS11`);
      continue;
    }
    const { data: ins, error: insErr } = await supabase
      .from("question_bank_items")
      .insert({
        unit: REACTION_RATE_BANK_UNIT_TITLE,
        skill_code: c.skill_code,
        difficulty: c.difficulty,
        question_text: c.question_text,
        choice_a: c.choice_a,
        choice_b: c.choice_b,
        choice_c: c.choice_c,
        choice_d: c.choice_d,
        correct_answer: c.correct_answer,
        explanation: c.explanation ?? null,
        sort_order: c.sort_order,
        source_key: c.source_key ?? `promoted_from_candidate_${c.id}`,
        excluded_from_video_quiz_pool: false,
      })
      .select("id")
      .single();
    if (insErr) throw insErr;
    const bankId = (ins as { id: string }).id;

    const { error: upErr } = await supabase
      .from("reaction_rate_question_candidates")
      .update({
        review_status: "promoted",
        promoted_bank_item_id: bankId,
      })
      .eq("id", c.id);
    if (upErr) throw upErr;
    promoted += 1;
  }

  console.log(`\n完成：已從候選區提升 ${promoted} 筆至 question_bank_items。`);
  console.log("若需重配影片測驗題，請另行執行：npm run seed:g8-video-quiz");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
