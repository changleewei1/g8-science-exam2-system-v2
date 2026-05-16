/**
 * 批次：第三次段考每支影片產生 3 題 AI 候選（draft）。
 * 使用：npm run generate:exam3:video-questions
 * 需：.env.local 內 OPENAI_API_KEY、Supabase service key；已 migration；影片已 skill tag。
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { generateExam3CandidatesForVideo } from "../src/lib/admin/generate-exam3-questions-for-video";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "../src/lib/exam3-scope";

async function main() {
  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiKey) {
    console.error("缺少 OPENAI_API_KEY");
    process.exit(1);
  }

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
  const list = videos ?? [];
  console.log(`[exam3-gen] 共 ${list.length} 支影片`);

  let ok = 0;
  let skip = 0;
  for (const v of list) {
    const vid = v.id as string;
    const title = v.title as string;
    const r = await generateExam3CandidatesForVideo(supabase, {
      videoUuid: vid,
      openAiKey,
      model: process.env.OPENAI_EXAM3_MODEL?.trim() || "gpt-4o-mini",
    });
    if (!r.ok) {
      console.warn(`[skip] ${title} (${vid}): ${r.reason} — ${r.message}`);
      skip += 1;
    } else {
      console.log(`[ok] ${title}: +${r.inserted} 候選`);
      ok += 1;
    }
    await new Promise((res) => setTimeout(res, 1500));
  }

  console.log(`\n完成：成功 ${ok} 支、略過 ${skip} 支。請至後台核准候選題。`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
