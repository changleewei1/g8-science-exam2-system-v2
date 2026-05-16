/**
 * 為第三次段考單元內「尚無 quizzes」的影片補上測驗壳（無 quiz_questions；真題由題庫同步寫入）。
 * 已存在 quizzes 者不變。
 *
 * 使用：npm run backfill:exam3-quizzes
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "../src/lib/exam3-scope";

async function main() {
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
    .select("id, unit_id, title")
    .in("unit_id", unitIds);
  if (vErr) throw vErr;

  let created = 0;
  let skipped = 0;

  for (const v of videos ?? []) {
    const videoId = v.id as string;
    const { data: existing, error: qErr } = await supabase
      .from("quizzes")
      .select("id")
      .eq("video_id", videoId)
      .maybeSingle();
    if (qErr) throw qErr;
    if (existing) {
      skipped += 1;
      continue;
    }

    const title = (v.title as string) ?? "影片";

    const { error: insQErr } = await supabase.from("quizzes").insert({
      video_id: videoId,
      title: `${title} — AI學習診斷`,
      description: "觀看 90% 後解鎖AI學習診斷；題目由老師核准之 AI 試題同步，無 placeholder。",
      pass_score: 2,
      question_count: 3,
      is_active: true,
    });
    if (insQErr) throw insQErr;

    created += 1;
  }

  console.log(`[backfill-exam3-quizzes] 新建 ${created} 份測驗、略過 ${skipped} 支（已有測驗）。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
