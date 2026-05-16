/**
 * 第三次段考：依題庫同步影片測驗；題庫不足時可選以 OpenAI 補 draft（不覆蓋已核准入庫題）。
 *
 * npm run regenerate:exam3:questions
 * npm run regenerate:exam3:questions -- --sync-only
 * npm run regenerate:exam3:questions -- --force
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { generateExam3CandidatesForVideo } from "../src/lib/admin/generate-exam3-questions-for-video";
import { syncVideoComprehensionQuizFromBank } from "../src/lib/admin/sync-video-quiz-from-bank";
import { looksLikePlaceholderQuizQuestion } from "../src/lib/exam3-video-quiz-guards";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "../src/lib/exam3-scope";

function parseArgs() {
  const argv = process.argv.slice(2);
  return {
    force: argv.includes("--force"),
    syncOnly: argv.includes("--sync-only"),
  };
}

async function countRealBank(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  videoId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("question_bank_items")
    .select("question_text, choice_a, choice_b, choice_c, choice_d")
    .eq("video_id", videoId);
  if (error) throw error;
  return (data ?? []).filter(
    (r) =>
      !looksLikePlaceholderQuizQuestion({
        questionText: String(r.question_text ?? ""),
        choiceA: String(r.choice_a ?? ""),
        choiceB: String(r.choice_b ?? ""),
        choiceC: String(r.choice_c ?? ""),
        choiceD: String(r.choice_d ?? ""),
      }),
  ).length;
}

async function countDrafts(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  videoId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("generated_question_candidates")
    .select("*", { count: "exact", head: true })
    .eq("video_id", videoId)
    .eq("status", "draft");
  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const { force, syncOnly } = parseArgs();
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  const supabase = getSupabaseAdmin();

  const { data: units, error: uErr } = await supabase
    .from("scope_units")
    .select("id")
    .eq("exam_scope_id", G8_SPRING_TERM_EXAM3_SCOPE_ID);
  if (uErr) throw uErr;
  const unitIds = (units ?? []).map((u) => u.id as string);
  if (unitIds.length === 0) {
    console.error("找不到第三次段考單元");
    process.exit(1);
  }

  const { data: videos, error: vErr } = await supabase
    .from("videos")
    .select("id, title")
    .in("unit_id", unitIds)
    .order("sort_order", { ascending: true });
  if (vErr) throw vErr;

  let synced = 0;
  let generated = 0;
  let skipped = 0;

  for (const v of videos ?? []) {
    const vid = v.id as string;
    const title = v.title as string;
    const bankN = await countRealBank(supabase, vid);
    if (bankN >= 3) {
      const r = await syncVideoComprehensionQuizFromBank(supabase, vid);
      if (r.ok) {
        console.log(`[sync ok] ${title}`);
        synced += 1;
      } else {
        console.warn(`[sync skip] ${title}: ${r.reason ?? ""}`);
        skipped += 1;
      }
      continue;
    }

    if (syncOnly) {
      console.log(`[skip] ${title}: 真題題庫 ${bankN}/3`);
      skipped += 1;
      continue;
    }

    if (!openAiKey) {
      console.log(`[skip] ${title}: 無 OPENAI_API_KEY，無法產生候選`);
      skipped += 1;
      continue;
    }

    const drafts = await countDrafts(supabase, vid);
    if (drafts > 0 && !force) {
      console.log(`[skip] ${title}: 已有 ${drafts} 筆 draft（核准後再跑，或加 --force）`);
      skipped += 1;
      continue;
    }

    const gen = await generateExam3CandidatesForVideo(supabase, {
      videoUuid: vid,
      openAiKey,
      model: process.env.OPENAI_EXAM3_MODEL?.trim() || "gpt-4o-mini",
    });
    if (!gen.ok) {
      console.warn(`[gen skip] ${title}: ${gen.reason} — ${gen.message}`);
      skipped += 1;
    } else {
      console.log(`[gen ok] ${title}: +${gen.inserted} draft`);
      generated += 1;
    }
    await new Promise((res) => setTimeout(res, 1200));
  }

  console.log(
    `\n完成：同步 ${synced} 支、新產 draft ${generated} 支、略過 ${skipped} 支。（核准入庫後再跑本腳本可同步測驗）`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
