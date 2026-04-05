/**
 * 依 data/g8_molar_videos_quiz_overrides.json，覆寫酸鹼單元指定 sort_order 影片的 3 題測驗。
 * 先 npm run import:playlists（需已有 quizzes），再可執行本腳本。
 * 使用：npm run apply:g8-molar-quizzes
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

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

function loadOverrides(): OverridesFile {
  const path = join(process.cwd(), OVERRIDES_PATH);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw) as OverridesFile;
}

async function main() {
  const { unitId, bySortOrder } = loadOverrides();
  const supabase = getSupabaseAdmin();

  const keys = Object.keys(bySortOrder).sort((a, b) => Number(a) - Number(b));
  let applied = 0;

  for (const key of keys) {
    const sortOrder = Number(key);
    if (Number.isNaN(sortOrder)) {
      console.warn(`略過無效的 sort_order 鍵：${key}`);
      continue;
    }

    const questions = bySortOrder[key];
    if (!Array.isArray(questions) || questions.length !== 3) {
      console.warn(
        `[sort_order ${sortOrder}] 必須恰好 3 題，目前 ${questions?.length ?? 0} 題，略過。`,
      );
      continue;
    }

    const { data: video, error: vErr } = await supabase
      .from("videos")
      .select("id, title, sort_order")
      .eq("unit_id", unitId)
      .eq("sort_order", sortOrder)
      .maybeSingle();

    if (vErr) throw vErr;
    if (!video) {
      console.warn(
        `[sort_order ${sortOrder}] 找不到影片（unit_id=${unitId}），略過。`,
      );
      continue;
    }

    const { data: quiz, error: qErr } = await supabase
      .from("quizzes")
      .select("id, title")
      .eq("video_id", video.id)
      .maybeSingle();

    if (qErr) throw qErr;
    if (!quiz) {
      console.warn(`[${video.title}] 無對應 quiz，略過。`);
      continue;
    }

    const { error: delErr } = await supabase.from("quiz_questions").delete().eq("quiz_id", quiz.id);
    if (delErr) throw delErr;

    const rows = questions.map((q, idx) => ({
      quiz_id: quiz.id,
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
    }));

    const { error: insErr } = await supabase.from("quiz_questions").insert(rows);
    if (insErr) throw insErr;

    applied += 1;
    console.log("OK:", sortOrder, video.title, "→", quiz.title);
  }

  console.log(`完成：已覆寫 ${applied} 份測驗（僅處理 JSON 內 bySortOrder 的項目）。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
