/**
 * 酸鹼中和單元：還原既有編修過的小考內容（不依賴舊 quiz_question id）。
 * - sort_order 8～15：data/g8_molar_videos_quiz_overrides.json
 * - sort_order 16～23：與 patch-acid-quiz-16-23 相同題幹（含第 22 題參考圖）
 * - 其餘排序：由題庫＋ video_skill_tags 自動配 3 題（同 seed:g8-video-quiz）
 *
 * 建議先：npm run dedupe:playlist-videos
 * 使用：npm run restore:acid-video-quizzes
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { acidPatchesForVideoSortOrder } from "./lib/acid-quiz-16-23-data";
import { loadQuestionBank, pickQuestionsForQuiz, type BankQuestion } from "./lib/g8-video-quiz-bank";
import { PLAYLIST_IMPORT_CONFIG } from "../src/seed/playlist-config";

const OVERRIDES_PATH = "data/g8_molar_videos_quiz_overrides.json";

type OverrideQuestion = {
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string;
  skill_code: string;
  difficulty: string;
};

type OverridesFile = {
  unitId: string;
  bySortOrder: Record<string, OverrideQuestion[]>;
};

const ACID_UNIT_ID = PLAYLIST_IMPORT_CONFIG[0].unitId;

function loadOverrides(): OverridesFile {
  const path = join(process.cwd(), OVERRIDES_PATH);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as OverridesFile;
}

async function replaceQuizMcq(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  quizId: string,
  questions: Array<
    OverrideQuestion | (BankQuestion & Partial<Record<string, string | null | undefined>>)
  >,
  imageFields?: Array<
    Partial<{
      question_image_url: string | null;
      reference_image_url: string | null;
      choice_a_image_url: string | null;
      choice_b_image_url: string | null;
      choice_c_image_url: string | null;
      choice_d_image_url: string | null;
    }>
  >,
) {
  const { error: delErr } = await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
  if (delErr) throw delErr;

  const rows = questions.map((q, idx) => {
    const img = imageFields?.[idx] ?? {};
    return {
      quiz_id: quizId,
      question_text: q.question_text,
      question_type: "mcq" as const,
      choice_a: q.choice_a,
      choice_b: q.choice_b,
      choice_c: q.choice_c,
      choice_d: q.choice_d,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      sort_order: idx,
      difficulty: q.difficulty,
      skill_code: q.skill_code,
      ...img,
    };
  });

  const { error: insErr } = await supabase.from("quiz_questions").insert(rows);
  if (insErr) throw insErr;
}

async function main() {
  const supabase = getSupabaseAdmin();
  const { unitId, bySortOrder } = loadOverrides();
  if (unitId !== ACID_UNIT_ID) {
    console.warn("警告：g8_molar_videos_quiz_overrides.json 的 unitId 與酸鹼預設單元不一致，仍用檔案內 unitId。");
  }

  const bank = await loadQuestionBank(supabase);
  if (bank.length === 0) {
    console.error("題庫為空");
    process.exit(1);
  }

  const { data: acidVideos, error: vErr } = await supabase
    .from("videos")
    .select("id, title, sort_order")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });
  if (vErr) throw vErr;
  if (!acidVideos?.length) {
    console.error("酸鹼單元沒有影片");
    process.exit(1);
  }

  let done = 0;

  for (const v of acidVideos) {
    const sortOrder = v.sort_order;
    const { data: quiz, error: qErr } = await supabase
      .from("quizzes")
      .select("id, title")
      .eq("video_id", v.id)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!quiz) {
      console.warn("略過（無 quiz）:", v.title);
      continue;
    }

    const patch16123 = acidPatchesForVideoSortOrder(sortOrder);
    if (patch16123) {
      const imageFields = patch16123.map((p) => ({
        question_image_url: p.question_image_url ?? null,
        reference_image_url: p.reference_image_url ?? null,
        choice_a_image_url: p.choice_a_image_url ?? null,
        choice_b_image_url: p.choice_b_image_url ?? null,
        choice_c_image_url: p.choice_c_image_url ?? null,
        choice_d_image_url: p.choice_d_image_url ?? null,
      }));
      await replaceQuizMcq(supabase, quiz.id, patch16123, imageFields);
      console.log("OK [16–23 精修]:", sortOrder, v.title);
      done++;
      continue;
    }

    const molarKey = String(sortOrder);
    if (sortOrder >= 8 && sortOrder <= 15 && bySortOrder[molarKey]) {
      const qs = bySortOrder[molarKey];
      if (!Array.isArray(qs) || qs.length !== 3) {
        console.warn(`[sort ${sortOrder}] 莫耳濃度 JSON 須 3 題，略過`);
        continue;
      }
      await replaceQuizMcq(supabase, quiz.id, qs);
      console.log("OK [莫耳濃度 JSON]:", sortOrder, v.title);
      done++;
      continue;
    }

    const { data: tags, error: tErr } = await supabase
      .from("video_skill_tags")
      .select("skill_code")
      .eq("video_id", v.id)
      .order("created_at", { ascending: true });
    if (tErr) throw tErr;
    const priority = (tags ?? []).map((t) => t.skill_code);
    const picked = pickQuestionsForQuiz(bank, priority, 3, sortOrder);
    if (picked.length < 3) {
      console.warn(`[${v.title}] 題庫不足 3 題，略過`);
      continue;
    }
    await replaceQuizMcq(supabase, quiz.id, picked);
    console.log("OK [題庫配題]:", sortOrder, v.title, "→", picked.map((p) => p.skill_code).join(", "));
    done++;
  }

  console.log(`完成：酸鹼單元已還原／覆寫 ${done} 份小考。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
