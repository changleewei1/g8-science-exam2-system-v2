/**
 * 檢查各 skill 題庫覆蓋率（是否達到目標題數）
 *
 * 用法：
 *   npm run check:skill-coverage
 *   npm run check:skill-coverage -- --target 10
 *   npm run check:skill-coverage -- --unit reaction_rate
 *   npm run check:skill-coverage -- --unit acid_base --only-below-target
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

function fmt(n: number): string {
  return String(n).padStart(2, " ");
}

async function main() {
  const target = Number(arg("--target") ?? "10");
  const unitFilter = arg("--unit")?.trim();
  const onlyBelow = process.argv.includes("--only-below-target");

  if (!Number.isFinite(target) || target <= 0) {
    throw new Error("--target 必須為正整數");
  }

  const supabase = getSupabaseAdmin();

  const { data: skills, error: sErr } = await supabase
    .from("skill_tags")
    .select("code, name, unit")
    .order("code", { ascending: true });
  if (sErr) throw sErr;

  const { data: bankRows, error: bErr } = await supabase
    .from("question_bank_items")
    .select("skill_code, unit");
  if (bErr) throw bErr;

  const countBySkill = new Map<string, number>();
  for (const r of bankRows ?? []) {
    const c = r.skill_code.toUpperCase();
    countBySkill.set(c, (countBySkill.get(c) ?? 0) + 1);
  }

  const rows = (skills ?? [])
    .filter((s) => (unitFilter ? s.unit === unitFilter : true))
    .map((s) => {
      const count = countBySkill.get(s.code.toUpperCase()) ?? 0;
      const gap = Math.max(0, target - count);
      const ok = count >= target;
      return {
        code: s.code.toUpperCase(),
        name: s.name || s.code.toUpperCase(),
        unit: s.unit,
        count,
        gap,
        ok,
      };
    })
    .filter((r) => (onlyBelow ? !r.ok : true))
    .sort((a, b) => a.code.localeCompare(b.code));

  const total = rows.length;
  const okCount = rows.filter((r) => r.ok).length;
  const below = rows.filter((r) => !r.ok);

  console.log("");
  console.log(`=== Skill Coverage Report (target=${target}) ===`);
  if (unitFilter) console.log(`unit filter: ${unitFilter}`);
  console.log(`skills listed: ${total}`);
  if (!onlyBelow) {
    console.log(`達標: ${okCount}`);
    console.log(`未達標: ${below.length}`);
  } else {
    const totalGap = rows.reduce((sum, r) => sum + r.gap, 0);
    console.log(`未達標 skills: ${rows.length}`);
    console.log(`合計缺口題數: ${totalGap}`);
  }
  console.log("");

  if (rows.length === 0) {
    console.log("沒有符合條件的 skill。");
    return;
  }

  for (const r of rows) {
    const status = r.ok ? "OK " : "LOW";
    const right = r.ok ? `count=${fmt(r.count)}` : `count=${fmt(r.count)} / need +${r.gap}`;
    console.log(`[${status}] ${r.code} ${r.name} (${r.unit}) -> ${right}`);
  }

  if (!onlyBelow && below.length > 0) {
    const totalGap = below.reduce((sum, r) => sum + r.gap, 0);
    console.log("");
    console.log(`未達標合計缺口題數: ${totalGap}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
