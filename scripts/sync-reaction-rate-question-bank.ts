/**
 * 依 data/reaction_rate_question_review.json 批次同步反應速率題庫。
 *
 * 預設：僅 DRY-RUN（不寫入）。
 * 實際寫入 question_bank_items / 候選表 請加：--apply-bank
 * 實際更新／刪除 quiz_questions 請加：--apply-quiz-questions（必要時再加 --allow-delete-quiz-questions）
 *
 * 使用：
 *   npm run sync:reaction-rate-review
 *   npm run sync:reaction-rate-review -- --apply-bank
 *   npm run sync:reaction-rate-review -- --apply-bank --apply-quiz-questions
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { REACTION_RATE_SCOPE_UNIT_ID, isReactionRateSkillCode } from "./lib/reaction-rate-constants";

const DATA_FILE = "data/reaction_rate_question_review.json";

type ReviewStatus = "keep" | "revise" | "remove" | "new";

type ReviewJsonItem = {
  id?: string;
  source_table?: "question_bank_items" | "quiz_questions";
  unit?: string;
  skill_code?: string;
  difficulty?: string;
  question_text?: string;
  choice_a?: string;
  choice_b?: string;
  choice_c?: string;
  choice_d?: string;
  correct_answer?: string;
  explanation?: string | null;
  sort_order?: number;
  quiz_id?: string | null;
  video_id?: string | null;
  video_title?: string | null;
  status?: ReviewStatus;
  quality_note?: string;
  new_question?: string;
  new_question_text?: string;
  new_choices?: { A?: string; B?: string; C?: string; D?: string };
  new_choice_a?: string;
  new_choice_b?: string;
  new_choice_c?: string;
  new_choice_d?: string;
  new_answer?: string;
  new_explanation?: string;
  suggested_skill_code?: string;
  suggested_video_id?: string;
  source_match_note?: string;
};

type ExportRoot = {
  meta?: { scope?: string };
  items: ReviewJsonItem[];
};

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    applyBank: argv.includes("--apply-bank"),
    applyQuizQuestions: argv.includes("--apply-quiz-questions"),
    allowDeleteQuizQuestions: argv.includes("--allow-delete-quiz-questions"),
  };
}

function assertRateSkill(code: string, ctx: string) {
  if (!isReactionRateSkillCode(code)) {
    throw new Error(`${ctx}：skill_code ${code} 不屬 RS01–RS11，已中止。`);
  }
}

function effectiveSkill(row: ReviewJsonItem): string {
  const sug = row.suggested_skill_code?.trim().toUpperCase() ?? "";
  if (sug && isReactionRateSkillCode(sug)) return sug;
  return (row.skill_code ?? "").trim().toUpperCase();
}

function pickNewQuestion(row: ReviewJsonItem): string {
  return (row.new_question_text ?? row.new_question ?? "").trim();
}

function pickNewChoices(row: ReviewJsonItem): { A: string; B: string; C: string; D: string } {
  if (row.new_choices && typeof row.new_choices === "object") {
    return {
      A: (row.new_choices.A ?? "").trim(),
      B: (row.new_choices.B ?? "").trim(),
      C: (row.new_choices.C ?? "").trim(),
      D: (row.new_choices.D ?? "").trim(),
    };
  }
  return {
    A: (row.new_choice_a ?? "").trim(),
    B: (row.new_choice_b ?? "").trim(),
    C: (row.new_choice_c ?? "").trim(),
    D: (row.new_choice_d ?? "").trim(),
  };
}

async function verifyQuizQuestionIsReactionRate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  quizId: string,
) {
  const { data: q, error } = await supabase.from("quizzes").select("video_id").eq("id", quizId).maybeSingle();
  if (error) throw error;
  if (!q) return false;
  const vid = (q as { video_id: string }).video_id;
  const { data: v, error: vErr } = await supabase
    .from("videos")
    .select("unit_id")
    .eq("id", vid)
    .maybeSingle();
  if (vErr) throw vErr;
  return (v as { unit_id: string } | null)?.unit_id === REACTION_RATE_SCOPE_UNIT_ID;
}

async function main() {
  const { applyBank, applyQuizQuestions, allowDeleteQuizQuestions } = parseArgs();
  const path = join(process.cwd(), DATA_FILE);
  const raw = readFileSync(path, "utf8");
  const root = JSON.parse(raw) as ExportRoot;
  if (!root.items || !Array.isArray(root.items)) {
    throw new Error("JSON 缺少 items 陣列");
  }

  const supabase = getSupabaseAdmin();

  const summary = {
    keep: 0,
    revise: 0,
    remove: 0,
    new: 0,
    skipped: 0,
    noBankWrites: 0,
    errors: [] as string[],
  };

  const bankExcludeIds: string[] = [];
  const bankPatches: { id: string; patch: Record<string, unknown> }[] = [];
  const quizPatches: { id: string; patch: Record<string, unknown> }[] = [];
  const quizDeletes: string[] = [];
  const insertsCandidates: Record<string, unknown>[] = [];

  const dryRun = !applyBank && !applyQuizQuestions;

  for (let i = 0; i < root.items.length; i++) {
    const row = root.items[i];
    const label = `#${i + 1} ${row.source_table ?? "?"} ${row.id || "(無 id)"}`;
    try {
      const status = row.status ?? "keep";
      if (!["keep", "revise", "remove", "new"].includes(status)) {
        summary.skipped += 1;
        summary.errors.push(`${label}：無效 status`);
        continue;
      }

      if (status === "new") {
        const sk = effectiveSkill(row);
        if (!sk) {
          summary.errors.push(`${label}：new 需 skill_code 或 suggested_skill_code（RS01–RS11）`);
          summary.skipped += 1;
          continue;
        }
        assertRateSkill(sk, label);
        const nq = pickNewQuestion(row);
        const nc = pickNewChoices(row);
        const na = row.new_answer?.trim().toUpperCase() ?? "";
        const ne = row.new_explanation?.trim() ?? "";
        if (!nq || !nc.A || !nc.B || !nc.C || !nc.D) {
          summary.errors.push(`${label}：new 需填滿題幹與選項（new_question_text / new_choices）`);
          summary.skipped += 1;
          continue;
        }
        if (!["A", "B", "C", "D"].includes(na)) {
          summary.errors.push(`${label}：new_answer 須為 A–D`);
          summary.skipped += 1;
          continue;
        }
        insertsCandidates.push({
          skill_code: sk,
          difficulty: row.difficulty?.trim() || "基礎",
          question_text: nq,
          choice_a: nc.A,
          choice_b: nc.B,
          choice_c: nc.C,
          choice_d: nc.D,
          correct_answer: na,
          explanation: ne || null,
          sort_order: row.sort_order ?? 0,
          source_key: `reaction_rate_review_${Date.now()}_${i}`,
          review_status: "pending",
        });
        summary.new += 1;
        continue;
      }

      const sk0 = effectiveSkill(row);
      assertRateSkill(sk0, label);

      if (status === "remove") {
        if (row.source_table === "question_bank_items") {
          if (!row.id) {
            summary.errors.push(`${label}：remove 需有 id`);
            summary.skipped += 1;
            continue;
          }
          bankExcludeIds.push(row.id);
        } else if (row.source_table === "quiz_questions") {
          if (!row.id) {
            summary.errors.push(`${label}：remove 需有 id`);
            summary.skipped += 1;
            continue;
          }
          if (!allowDeleteQuizQuestions) {
            summary.errors.push(`${label}：略過刪除 quiz_questions（请加 --allow-delete-quiz-questions）`);
            summary.skipped += 1;
            continue;
          }
          const ok = row.quiz_id ? await verifyQuizQuestionIsReactionRate(supabase, row.quiz_id) : false;
          if (!ok) {
            summary.errors.push(`${label}：quiz 不屬反應速率單元，禁止刪除`);
            summary.skipped += 1;
            continue;
          }
          quizDeletes.push(row.id);
        } else {
          summary.skipped += 1;
          summary.errors.push(`${label}：remove 需指定 source_table`);
          continue;
        }
        summary.remove += 1;
        continue;
      }

      if (status === "revise") {
        const nq = pickNewQuestion(row);
        const nc = pickNewChoices(row);
        const na = row.new_answer?.trim().toUpperCase() ?? "";
        const ne = row.new_explanation ?? "";
        if (!nq || !nc.A || !nc.B || !nc.C || !nc.D) {
          summary.errors.push(`${label}：revise 需填滿 new_question_text 與選項`);
          summary.skipped += 1;
          continue;
        }
        if (!["A", "B", "C", "D"].includes(na)) {
          summary.errors.push(`${label}：new_answer 須為 A–D`);
          summary.skipped += 1;
          continue;
        }
        if (!row.id) {
          summary.errors.push(`${label}：revise 需有 id`);
          summary.skipped += 1;
          continue;
        }
        const patch = {
          question_text: nq,
          choice_a: nc.A,
          choice_b: nc.B,
          choice_c: nc.C,
          choice_d: nc.D,
          correct_answer: na,
          explanation: ne.trim() ? ne.trim() : null,
          difficulty: row.difficulty?.trim() || "基礎",
          skill_code: sk0,
        };
        if (row.source_table === "question_bank_items") {
          bankPatches.push({ id: row.id, patch });
        } else if (row.source_table === "quiz_questions") {
          const ok = row.quiz_id ? await verifyQuizQuestionIsReactionRate(supabase, row.quiz_id) : false;
          if (!ok) {
            summary.errors.push(`${label}：quiz 不屬反應速率單元，禁止更新`);
            summary.skipped += 1;
            continue;
          }
          quizPatches.push({ id: row.id, patch });
        } else {
          summary.skipped += 1;
          summary.errors.push(`${label}：revise 需指定 source_table`);
          continue;
        }
        summary.revise += 1;
        continue;
      }

      // keep
      if (!row.id) {
        summary.skipped += 1;
        summary.errors.push(`${label}：keep 需有 id`);
        continue;
      }
      const baseBankPatch: Record<string, unknown> = {};
      const ne = row.new_explanation?.trim() ?? "";
      if (ne) {
        baseBankPatch.explanation = ne;
      }
      if (row.suggested_skill_code?.trim() && isReactionRateSkillCode(row.suggested_skill_code.trim())) {
        baseBankPatch.skill_code = row.suggested_skill_code.trim().toUpperCase();
      }

      if (row.source_table === "question_bank_items") {
        if (Object.keys(baseBankPatch).length > 0) {
          bankPatches.push({ id: row.id, patch: baseBankPatch });
        } else {
          summary.noBankWrites += 1;
        }
      } else if (row.source_table === "quiz_questions") {
        const quizPatch: Record<string, unknown> = {};
        if (row.new_explanation?.trim()) {
          quizPatch.explanation = row.new_explanation.trim();
        }
        if (row.suggested_skill_code?.trim() && isReactionRateSkillCode(row.suggested_skill_code.trim())) {
          quizPatch.skill_code = row.suggested_skill_code.trim().toUpperCase();
        }
        if (Object.keys(quizPatch).length > 0) {
          const ok = row.quiz_id ? await verifyQuizQuestionIsReactionRate(supabase, row.quiz_id) : false;
          if (!ok) {
            summary.errors.push(`${label}：quiz 不屬反應速率單元，禁止更新`);
            summary.skipped += 1;
            continue;
          }
          quizPatches.push({ id: row.id, patch: quizPatch });
        } else {
          summary.noBankWrites += 1;
        }
      } else {
        summary.skipped += 1;
        summary.errors.push(`${label}：keep 需指定 source_table`);
        continue;
      }
      summary.keep += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`${label}：${msg}`);
      summary.skipped += 1;
    }
  }

  const bankExcludeCount = bankExcludeIds.length;
  const bankPatchCount = bankPatches.length;
  const quizPatchCount = quizPatches.length;
  const quizDeleteCount = quizDeletes.length;
  const newCandCount = insertsCandidates.length;

  console.log("\n========== 反應速率題庫同步（RS01–RS11）==========");
  console.log(`模式：${dryRun ? "DRY-RUN（未指定 --apply-bank / --apply-quiz-questions）" : "將依旗標寫入"}`);
  console.log(`  apply-bank：${applyBank}`);
  console.log(`  apply-quiz-questions：${applyQuizQuestions}`);
  console.log(`  allow-delete-quiz-questions：${allowDeleteQuizQuestions}`);
  console.log(`將軟排除 question_bank_items（excluded_from_video_quiz_pool）：${bankExcludeCount} 筆`);
  console.log(`將更新 question_bank_items 欄位：${bankPatchCount} 筆`);
  console.log(`將寫入 reaction_rate_question_candidates（pending）：${newCandCount} 筆`);
  console.log(`將更新 quiz_questions：${quizPatchCount} 筆`);
  console.log(`將刪除 quiz_questions：${quizDeleteCount} 筆`);
  console.log(`keep 無需寫入題庫列：${summary.noBankWrites}`);
  console.log(`略過 / 錯誤列：${summary.skipped}`);

  if (summary.errors.length > 0) {
    console.log("\n--- 訊息 / 略過原因（前 40 筆）---");
    for (const line of summary.errors.slice(0, 40)) {
      console.log(line);
    }
    if (summary.errors.length > 40) {
      console.log(`… 共 ${summary.errors.length} 則`);
    }
  }

  if (dryRun) {
    console.log(
      "\nDRY-RUN 結束：未寫入。若要寫入題庫與候選表請加 --apply-bank；若要一併改正式測驗題加 --apply-quiz-questions。",
    );
    return;
  }

  if (applyBank) {
    for (const id of bankExcludeIds) {
      const { error } = await supabase
        .from("question_bank_items")
        .update({ excluded_from_video_quiz_pool: true })
        .eq("id", id);
      if (error) throw error;
    }
    for (const { id, patch } of bankPatches) {
      const { error } = await supabase.from("question_bank_items").update(patch).eq("id", id);
      if (error) throw error;
    }
    if (insertsCandidates.length > 0) {
      const { error } = await supabase.from("reaction_rate_question_candidates").insert(insertsCandidates);
      if (error) throw error;
    }
  } else {
    if (bankExcludeCount > 0 || bankPatchCount > 0 || newCandCount > 0) {
      console.warn(
        "未指定 --apply-bank：已跳過 question_bank_items 與候選表寫入（quiz 仍可能更新，見下方）。",
      );
    }
  }

  if (applyQuizQuestions) {
    for (const id of quizDeletes) {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
      if (error) throw error;
    }
    for (const { id, patch } of quizPatches) {
      const { error } = await supabase.from("quiz_questions").update(patch).eq("id", id);
      if (error) throw error;
    }
  } else if (quizPatchCount > 0 || quizDeleteCount > 0) {
    console.warn(
      `預覽有 ${quizPatchCount} 筆 quiz 更新、${quizDeleteCount} 筆刪除，但未指定 --apply-quiz-questions，已跳過。`,
    );
  }

  console.log("\n同步完成。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
