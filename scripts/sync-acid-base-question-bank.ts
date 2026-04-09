/**
 * 依 data/acid_base_question_review.json 批次同步酸鹼中和題庫（僅 question_bank_items / 酸鹼單元 quiz_questions）。
 * 使用：
 *   npm run sync:acid-base-review
 *   npm run sync:acid-base-review -- --dry-run
 *   npm run sync:acid-base-review -- --allow-delete-quiz-questions
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import {
  ACID_BASE_SCOPE_UNIT_ID,
  ACID_BASE_SKILL_CODES,
  isAcidBaseSkillCode,
} from "./lib/acid-base-constants";

const DATA_FILE = "data/acid_base_question_review.json";

type ReviewStatus = "keep" | "revise" | "remove" | "new";

type ReviewItem = {
  id: string;
  source_table: "question_bank_items" | "quiz_questions";
  unit?: string;
  skill_code: string;
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  answer: string;
  explanation: string | null;
  difficulty: string;
  quiz_id?: string | null;
  video_id?: string | null;
  status: ReviewStatus;
  quality_note?: string;
  new_question?: string;
  new_choices?: { A: string; B: string; C: string; D: string };
  new_answer?: string;
  new_explanation?: string;
};

type ExportRoot = {
  meta?: { scope?: string };
  items: ReviewItem[];
};

const DEFAULT_BANK_UNIT = "酸鹼中和";

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    dryRun: argv.includes("--dry-run"),
    allowDeleteQuizQuestions: argv.includes("--allow-delete-quiz-questions"),
  };
}

function assertAcidSkill(code: string, ctx: string) {
  if (!isAcidBaseSkillCode(code)) {
    throw new Error(`${ctx}：skill_code ${code} 不在酸鹼中和允許清單，已中止（避免誤改 reaction_rate）。`);
  }
}

async function verifyQuizQuestionIsAcid(supabase: ReturnType<typeof getSupabaseAdmin>, quizId: string) {
  const { data: q, error } = await supabase
    .from("quizzes")
    .select("video_id")
    .eq("id", quizId)
    .maybeSingle();
  if (error) throw error;
  if (!q) return false;
  const vid = (q as { video_id: string }).video_id;
  const { data: v, error: vErr } = await supabase
    .from("videos")
    .select("unit_id")
    .eq("id", vid)
    .maybeSingle();
  if (vErr) throw vErr;
  return (v as { unit_id: string } | null)?.unit_id === ACID_BASE_SCOPE_UNIT_ID;
}

async function main() {
  const { dryRun, allowDeleteQuizQuestions } = parseArgs();
  const path = join(process.cwd(), DATA_FILE);
  const raw = readFileSync(path, "utf8");
  const root = JSON.parse(raw) as ExportRoot;
  if (!root.items || !Array.isArray(root.items)) {
    throw new Error("JSON 缺少 items 陣列");
  }

  if (root.meta?.scope && root.meta.scope !== "acid_base") {
    console.warn("警告：meta.scope 不是 acid_base，仍僅依 skill / 安全檢查處理。");
  }

  const summary = {
    keep: 0,
    revise: 0,
    remove: 0,
    new: 0,
    skipped: 0,
    errors: [] as string[],
  };

  const supabase = getSupabaseAdmin();

  const removesBank: string[] = [];
  const removesQuiz: string[] = [];
  const updatesBank: { id: string; patch: Record<string, unknown> }[] = [];
  const updatesQuiz: { id: string; patch: Record<string, unknown> }[] = [];
  const insertsBank: Record<string, unknown>[] = [];

  for (let i = 0; i < root.items.length; i++) {
    const row = root.items[i];
    const label = `#${i + 1} ${row.source_table} ${row.id || "(無 id)"}`;
    try {
      const status = row.status ?? "keep";
      if (!["keep", "revise", "remove", "new"].includes(status)) {
        summary.skipped += 1;
        summary.errors.push(`${label}：無效 status`);
        continue;
      }

      if (status === "new") {
        assertAcidSkill(row.skill_code ?? "", label);
        const nq = row.new_question?.trim() ?? "";
        const nc = row.new_choices ?? { A: "", B: "", C: "", D: "" };
        const na = row.new_answer?.trim().toUpperCase() ?? "";
        const ne = row.new_explanation?.trim() ?? "";
        if (!nq || !nc.A?.trim() || !nc.B?.trim() || !nc.C?.trim() || !nc.D?.trim()) {
          summary.errors.push(`${label}：new 需填滿 new_question 與 new_choices A–D`);
          summary.skipped += 1;
          continue;
        }
        if (!["A", "B", "C", "D"].includes(na)) {
          summary.errors.push(`${label}：new_answer 須為 A–D`);
          summary.skipped += 1;
          continue;
        }
        const unit = row.unit?.trim() || DEFAULT_BANK_UNIT;
        insertsBank.push({
          unit,
          skill_code: row.skill_code.trim(),
          difficulty: row.difficulty?.trim() || "基礎",
          question_text: nq,
          choice_a: nc.A.trim(),
          choice_b: nc.B.trim(),
          choice_c: nc.C.trim(),
          choice_d: nc.D.trim(),
          correct_answer: na,
          explanation: ne || null,
          sort_order: 0,
          source_key: `acid_base_review_import_${Date.now()}_${i}`,
        });
        summary.new += 1;
        continue;
      }

      assertAcidSkill(row.skill_code ?? "", label);

      if (status === "remove") {
        if (row.source_table === "question_bank_items") {
          if (!row.id) {
            summary.errors.push(`${label}：remove 需有 id`);
            summary.skipped += 1;
            continue;
          }
          removesBank.push(row.id);
        } else {
          if (!row.id) {
            summary.errors.push(`${label}：remove 需有 id`);
            summary.skipped += 1;
            continue;
          }
          if (!allowDeleteQuizQuestions) {
            summary.errors.push(
              `${label}：略過刪除 quiz_questions（请加 --allow-delete-quiz-questions）`,
            );
            summary.skipped += 1;
            continue;
          }
          const ok = row.quiz_id ? await verifyQuizQuestionIsAcid(supabase, row.quiz_id) : false;
          if (!ok) {
            summary.errors.push(`${label}：quiz 不屬酸鹼單元，禁止刪除`);
            summary.skipped += 1;
            continue;
          }
          removesQuiz.push(row.id);
        }
        summary.remove += 1;
        continue;
      }

      if (status === "revise") {
        const nq = row.new_question?.trim() ?? "";
        const nc = row.new_choices ?? { A: "", B: "", C: "", D: "" };
        const na = row.new_answer?.trim().toUpperCase() ?? "";
        const ne = row.new_explanation ?? "";
        if (!nq || !nc.A?.trim() || !nc.B?.trim() || !nc.C?.trim() || !nc.D?.trim()) {
          summary.errors.push(`${label}：revise 需填滿 new_question 與 new_choices A–D`);
          summary.skipped += 1;
          continue;
        }
        if (!["A", "B", "C", "D"].includes(na)) {
          summary.errors.push(`${label}：new_answer 須為 A–D`);
          summary.skipped += 1;
          continue;
        }
        if (!row.id) {
          summary.skipped += 1;
          summary.errors.push(`${label}：revise 需有 id`);
          continue;
        }
        const patch = {
          question_text: nq,
          choice_a: nc.A.trim(),
          choice_b: nc.B.trim(),
          choice_c: nc.C.trim(),
          choice_d: nc.D.trim(),
          correct_answer: na,
          explanation: ne.trim() ? ne.trim() : null,
          difficulty: row.difficulty?.trim() || "基礎",
          skill_code: row.skill_code.trim(),
        };
        if (row.source_table === "question_bank_items") {
          updatesBank.push({ id: row.id, patch });
        } else {
          const ok = row.quiz_id ? await verifyQuizQuestionIsAcid(supabase, row.quiz_id) : false;
          if (!ok) {
            summary.errors.push(`${label}：quiz 不屬酸鹼單元，禁止更新`);
            summary.skipped += 1;
            continue;
          }
          updatesQuiz.push({ id: row.id, patch });
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
      const patch = {
        question_text: row.question.trim(),
        choice_a: row.choices.A.trim(),
        choice_b: row.choices.B.trim(),
        choice_c: row.choices.C.trim(),
        choice_d: row.choices.D.trim(),
        correct_answer: row.answer.trim().toUpperCase().charAt(0),
        explanation: row.explanation?.trim() ? row.explanation.trim() : null,
        difficulty: row.difficulty?.trim() || "基礎",
        skill_code: row.skill_code.trim(),
      };
      if (patch.correct_answer !== "A" && patch.correct_answer !== "B" && patch.correct_answer !== "C" && patch.correct_answer !== "D") {
        summary.errors.push(`${label}：answer 無效`);
        summary.skipped += 1;
        continue;
      }
      if (row.source_table === "question_bank_items") {
        updatesBank.push({ id: row.id, patch });
      } else {
        const ok = row.quiz_id ? await verifyQuizQuestionIsAcid(supabase, row.quiz_id) : false;
        if (!ok) {
          summary.errors.push(`${label}：quiz 不屬酸鹼單元，禁止更新`);
          summary.skipped += 1;
          continue;
        }
        updatesQuiz.push({ id: row.id, patch });
      }
      summary.keep += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      summary.errors.push(`${label}：${msg}`);
      summary.skipped += 1;
    }
  }

  console.log("\n========== 酸鹼中和題庫同步（僅 EL/AB/CO/NE + 酸鹼影片測驗）==========");
  console.log(`模式：${dryRun ? "DRY-RUN（不寫入）" : "實際寫入"}`);
  console.log(`將刪除 question_bank_items：${removesBank.length} 筆`);
  console.log(`將刪除 quiz_questions：${removesQuiz.length} 筆`);
  console.log(`將更新 question_bank_items：${updatesBank.length} 筆`);
  console.log(`將更新 quiz_questions：${updatesQuiz.length} 筆`);
  console.log(`將新增 question_bank_items：${insertsBank.length} 筆`);
  console.log(`略過 / 錯誤列：${summary.skipped}`);
  if (summary.errors.length > 0) {
    console.log("\n--- 訊息 / 略錄原因（前 30 筆）---");
    for (const line of summary.errors.slice(0, 30)) {
      console.log(line);
    }
    if (summary.errors.length > 30) {
      console.log(`… 共 ${summary.errors.length} 則`);
    }
  }

  if (dryRun) {
    console.log("\nDRY-RUN 結束，未寫入 Supabase。");
    return;
  }

  for (const id of removesQuiz) {
    const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
    if (error) throw error;
  }
  for (const id of removesBank) {
    const { error } = await supabase.from("question_bank_items").delete().eq("id", id);
    if (error) throw error;
  }
  for (const { id, patch } of updatesBank) {
    const { error } = await supabase.from("question_bank_items").update(patch).eq("id", id);
    if (error) throw error;
  }
  for (const { id, patch } of updatesQuiz) {
    const { error } = await supabase.from("quiz_questions").update(patch).eq("id", id);
    if (error) throw error;
  }
  if (insertsBank.length > 0) {
    const { error } = await supabase.from("question_bank_items").insert(insertsBank);
    if (error) throw error;
  }

  console.log("\n同步完成。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
