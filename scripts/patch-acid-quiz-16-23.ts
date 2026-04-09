/**
 * 一次更新酸鹼單元第 16～23 部影片的 quiz_questions（每份 3 題）。
 * 依 DB 既有列 id 更新；若曾跑過 seed:g8-video-quiz 導致 id 已變，請改用 npm run restore:acid-video-quizzes。
 * 使用：npx tsx scripts/patch-acid-quiz-16-23.ts
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { ACID_QUIZ_16_23_UPDATES as UPDATES } from "./lib/acid-quiz-16-23-data";

async function main() {
  const supabase = getSupabaseAdmin();
  let ok = 0;
  for (const [id, patch] of Object.entries(UPDATES)) {
    const { error } = await supabase.from("quiz_questions").update(patch).eq("id", id);
    if (error) {
      console.error(id, error.message);
      process.exit(1);
    }
    ok++;
  }
  console.log(`已更新 ${ok} 筆 quiz_questions（酸鹼影片 16～23）。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
