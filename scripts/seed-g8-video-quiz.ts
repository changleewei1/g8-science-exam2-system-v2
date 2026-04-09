/**
 * 依 video_skill_tags 的 skill_code 優先匹配，為每個 quiz 寫入 3 題。
 * 題目來源：優先 public.question_bank_items；若為空則讀取 data/g8_science_exam2_question_bank.json
 * 使用：npm run seed:g8-video-quiz
 *
 * 僅處理指定單元（逗號分隔 UUID）：
 *   SEED_VIDEO_QUIZ_ONLY_UNIT_IDS=b0000001-0000-4000-8000-000000000003 npm run seed:g8-video-quiz
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { loadQuestionBank, pickQuestionsForQuiz } from "./lib/g8-video-quiz-bank";

function rowVideosEmbed(quiz: unknown): { sort_order: number } | null {
  if (!quiz || typeof quiz !== "object") return null;
  const v = (quiz as { videos?: unknown }).videos;
  if (Array.isArray(v) && v[0] && typeof v[0] === "object" && v[0] !== null && "sort_order" in v[0]) {
    return { sort_order: Number((v[0] as { sort_order: number }).sort_order) };
  }
  if (typeof v === "object" && v !== null && "sort_order" in v) {
    return { sort_order: Number((v as { sort_order: number }).sort_order) };
  }
  return null;
}

function parseOnlyUnitIds(): string[] | null {
  const raw = process.env.SEED_VIDEO_QUIZ_ONLY_UNIT_IDS?.trim();
  if (!raw) return null;
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return ids.length ? ids : null;
}

async function main() {
  const supabase = getSupabaseAdmin();
  const bank = await loadQuestionBank(supabase);
  if (bank.length === 0) {
    console.error("題庫為空，請先執行 npm run seed:g8-question-bank 或檢查 JSON。");
    process.exit(1);
  }

  let { data: quizzes, error: qErr } = await supabase
    .from("quizzes")
    .select("id, video_id, title, videos(sort_order)");
  if (qErr) throw qErr;
  if (!quizzes?.length) {
    console.log("沒有 quiz 資料，請先 npm run import:playlists。");
    return;
  }

  const onlyUnits = parseOnlyUnitIds();
  if (onlyUnits?.length) {
    const videoIds = [...new Set(quizzes.map((q) => q.video_id))];
    const { data: vrows, error: vErr } = await supabase
      .from("videos")
      .select("id, unit_id")
      .in("id", videoIds);
    if (vErr) throw vErr;
    const allow = new Set(
      (vrows ?? []).filter((v) => onlyUnits.includes(v.unit_id)).map((v) => v.id),
    );
    quizzes = quizzes.filter((q) => allow.has(q.video_id));
    console.log(
      `僅處理單元 ${onlyUnits.join(", ")}：${quizzes.length} 份測驗`,
    );
    if (quizzes.length === 0) return;
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
