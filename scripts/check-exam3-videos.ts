import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "../src/lib/exam3-scope";

async function main() {
  const supabase = getSupabaseAdmin();
  const { data: units, error: uErr } = await supabase
    .from("scope_units")
    .select("id, unit_code, unit_title")
    .eq("exam_scope_id", G8_SPRING_TERM_EXAM3_SCOPE_ID);
  if (uErr) throw uErr;

  for (const u of units ?? []) {
    const unitId = u.id as string;
    const { data: all, error } = await supabase.from("videos").select("id, title, is_active, management_status, unit_id").eq("unit_id", unitId);
    if (error) throw error;
    const { data: visible, error: vErr } = await supabase
      .from("videos")
      .select("id, title")
      .eq("unit_id", unitId)
      .eq("is_active", true)
      .eq("management_status", "active");
    if (vErr) throw vErr;
    console.log(`\n${u.unit_title} (${u.unit_code}) unit_id=${unitId}`);
    console.log(`  total in unit: ${all?.length ?? 0}, student-visible: ${visible?.length ?? 0}`);
    for (const v of all ?? []) {
      console.log(`  - ${v.title} active=${v.is_active} status=${v.management_status}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
