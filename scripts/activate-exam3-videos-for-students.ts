/**
 * 第三次段考：將已匯入影片設為學生可見（management_status = active）。
 * AI 產題曾將狀態改為 pending_review，學生端列表會因此為空。
 *
 * npm run activate:exam3:videos
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
    .select("id, unit_title")
    .eq("exam_scope_id", G8_SPRING_TERM_EXAM3_SCOPE_ID);
  if (uErr) throw uErr;
  const unitIds = (units ?? []).map((u) => u.id as string);
  if (unitIds.length === 0) {
    console.error("找不到第三次段考單元");
    process.exit(1);
  }

  const { data: videos, error: vErr } = await supabase
    .from("videos")
    .select("id, title, management_status, is_active")
    .in("unit_id", unitIds)
    .eq("is_active", true);
  if (vErr) throw vErr;

  let updated = 0;
  for (const v of videos ?? []) {
    if ((v.management_status as string) === "active") continue;
    const { error } = await supabase
      .from("videos")
      .update({ management_status: "active" })
      .eq("id", v.id as string);
    if (error) throw error;
    console.log(`[active] ${v.title}`);
    updated += 1;
  }

  console.log(`\n完成：${updated} 支影片已設為 active（共 ${videos?.length ?? 0} 支啟用中）。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
