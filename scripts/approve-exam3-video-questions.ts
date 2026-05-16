/**
 * 第三次段考：批次核准非 placeholder 的 draft 候選題（每支影片最多 3 題真題庫），並同步測驗。
 *
 * npm run approve:exam3:video-questions
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { approveExam3DraftsForVideo, countRealExam3BankItems } from "../src/lib/admin/approve-exam3-candidate";
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
    .select("id, title, unit_id")
    .in("unit_id", unitIds)
    .order("sort_order", { ascending: true });
  if (vErr) throw vErr;

  let ready = 0;
  let partial = 0;
  let empty = 0;

  for (const v of videos ?? []) {
    const videoId = v.id as string;
    const title = v.title as string;
    const before = await countRealExam3BankItems(supabase, videoId);
    const result = await approveExam3DraftsForVideo(supabase, videoId, 3);
    const after = result.bankCount;

    if (after >= 3 && result.synced) {
      console.log(`[ready] ${title} — 題庫 ${after} 題，測驗已同步`);
      ready += 1;
    } else if (after > 0 || result.approved > 0) {
      console.log(
        `[partial] ${title} — 題庫 ${before}→${after}，本次核准 ${result.approved}，略過占位 ${result.skippedPlaceholder}，同步=${result.synced}`,
      );
      partial += 1;
    } else {
      console.log(`[empty] ${title} — 尚無可核准題目（請先 auto-tag + regenerate）`);
      empty += 1;
    }
  }

  console.log(`\n完成：可作答 ${ready} 支、部分完成 ${partial} 支、尚無題 ${empty} 支。`);
  console.log("建議接續：npm run regenerate:exam3:questions -- --sync-only");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
