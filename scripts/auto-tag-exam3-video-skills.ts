/**
 * 第三次段考：依影片標題關鍵字自動寫入 video_skill_tags（不重複 video_id + skill_code）。
 * 僅處理 exam3 scope 之影片，不影響其他段考。
 *
 * npm run auto-tag:exam3:video-skills
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "../src/lib/exam3-scope";

type Rule = {
  /** 任一關鍵字命中即套用（子字串） */
  keywords: string[];
  codes: string[];
  /** 若標題含任一字串，則整條規則不套用 */
  excludeKeywords?: string[];
};

/** 較具體的規則放前面，避免「壓力」誤套到「液體壓力」等 */
const TITLE_RULES: Rule[] = [
  // —— 力與壓力（細項優先）——
  { keywords: ["摩擦力的測量"], codes: ["P2-6-2-06", "P2-6-2-07"] },
  { keywords: ["摩擦力的性質"], codes: ["P2-6-2-02", "P2-6-2-03"] },
  { keywords: ["摩擦力的應用"], codes: ["P2-6-2-09", "P2-6-2-10", "P2-6-2-11"] },
  { keywords: ["摩擦力"], codes: ["P2-6-2-01", "P2-6-2-03", "P2-6-2-04"] },
  { keywords: ["液體壓力"], codes: ["P2-6-3-01", "P2-6-3-07"] },
  { keywords: ["大氣壓力"], codes: ["P2-6-3-01"] },
  { keywords: ["接觸面的壓力", "固體壓力"], codes: ["P2-6-3-01", "P2-6-3-02", "P2-6-3-04"] },
  {
    keywords: ["壓力"],
    codes: ["P2-6-3-01", "P2-6-3-02", "P2-6-3-04"],
    excludeKeywords: ["液體壓力", "大氣壓力"],
  },
  { keywords: ["帕斯卡"], codes: ["P2-6-3-07"] },
  { keywords: ["虎克定律"], codes: ["P2-6-1-08", "P2-6-1-09"] },
  { keywords: ["力的測量"], codes: ["P2-6-1-08"] },
  { keywords: ["力的合成", "合力", "平行四邊形"], codes: ["P2-6-1-07", "P2-6-1-09"] },
  { keywords: ["力的認識", "力與平衡"], codes: ["P2-6-1-01", "P2-6-1-02", "P2-6-1-06"] },
  { keywords: ["重量單位", "重力"], codes: ["P2-6-1-04"] },
  { keywords: ["浮力", "阿基米德"], codes: ["P2-6-4-01", "P2-6-4-02", "P2-6-4-06"] },
  { keywords: ["沈體", "沉體", "浮體", "浮力與密度"], codes: ["P2-6-4-03", "P2-6-4-04", "P2-6-4-05"] },
  { keywords: ["淡水進入海水"], codes: ["P2-6-4-09"] },
  { keywords: ["潛水艇", "船"], codes: ["P2-6-4-07", "P2-6-4-10"] },

  // —— 有機化合物（細項優先）——
  { keywords: ["什麼是有機化合物"], codes: ["C2-11-01", "C2-11-02"] },
  { keywords: ["常見的有機化合物"], codes: ["C2-12-01", "C2-12-02", "C2-12-03"] },
  { keywords: ["木材乾餾"], codes: ["C2-11-05", "C2-11-09"] },
  { keywords: ["食物的營養素"], codes: ["C2-12-01", "C2-12-02", "C2-12-03"] },
  { keywords: ["發酵食品", "食物的保存"], codes: ["C2-14-05", "C2-14-06"] },
  { keywords: ["醋"], codes: ["C2-14-05", "C2-14-06"] },
  { keywords: ["蛋白質"], codes: ["C2-12-03", "C2-14-07"] },
  { keywords: ["脂肪"], codes: ["C2-12-02", "C2-12-09"] },
  { keywords: ["清潔劑"], codes: ["C2-13-01", "C2-13-02", "C2-13-03"] },
  { keywords: ["聚合物", "塑膠"], codes: ["C2-12-06", "C2-14-04"] },
  { keywords: ["衣料纖維"], codes: ["C2-14-01"] },
  { keywords: ["醇類", "酒精"], codes: ["C2-12-04"] },
  { keywords: ["烴類", "烃類", "烃"], codes: ["C2-12-08"] },
  { keywords: ["有機化合物"], codes: ["C2-11-01", "C2-11-02"] },
];

function normTitle(t: string): string {
  return t.trim();
}

function matchesRule(title: string, rule: Rule): boolean {
  const t = title;
  if (rule.excludeKeywords?.some((k) => t.includes(k))) return false;
  return rule.keywords.some((k) => t.includes(k));
}

export function inferSkillCodesFromExam3Title(title: string): string[] {
  const t = normTitle(title);
  const out = new Set<string>();
  for (const rule of TITLE_RULES) {
    if (matchesRule(t, rule)) {
      for (const c of rule.codes) out.add(c);
    }
  }
  return [...out];
}

async function main() {
  const supabase = getSupabaseAdmin();

  const { data: units, error: uErr } = await supabase
    .from("scope_units")
    .select("id, unit_title")
    .eq("exam_scope_id", G8_SPRING_TERM_EXAM3_SCOPE_ID);
  if (uErr) throw uErr;
  const unitIds = (units ?? []).map((u) => u.id as string);
  if (unitIds.length === 0) {
    console.error("找不到第三次段考單元（exam_scope_id 不符）");
    process.exit(1);
  }

  const { data: videos, error: vErr } = await supabase
    .from("videos")
    .select("id, unit_id, title")
    .in("unit_id", unitIds)
    .order("sort_order", { ascending: true });
  if (vErr) throw vErr;
  const list = videos ?? [];
  if (list.length === 0) {
    console.log("第三次段考尚無影片。");
    return;
  }

  const videoIds = list.map((v) => v.id as string);
  const { data: existingRows, error: exErr } = await supabase
    .from("video_skill_tags")
    .select("video_id, skill_code")
    .in("video_id", videoIds);
  if (exErr) throw exErr;

  const existing = new Set<string>();
  for (const r of existingRows ?? []) {
    existing.add(`${r.video_id}::${String(r.skill_code ?? "").trim()}`);
  }

  const allCodes = new Set<string>();
  for (const v of list) {
    for (const c of inferSkillCodesFromExam3Title(String(v.title ?? ""))) {
      allCodes.add(c);
    }
  }

  const nameByCode = new Map<string, string>();
  if (allCodes.size > 0) {
    const { data: meta, error: mErr } = await supabase
      .from("skill_tags")
      .select("code, name")
      .in("code", [...allCodes]);
    if (mErr) throw mErr;
    for (const m of meta ?? []) {
      const code = String(m.code ?? "").trim();
      const name = String(m.name ?? "").trim();
      if (code) nameByCode.set(code, name || code);
    }
  }

  let videosTagged = 0;
  let rowsInserted = 0;
  const perVideo: { id: string; title: string; added: string[]; inferred: string[]; hadAny: boolean }[] = [];

  for (const v of list) {
    const videoId = v.id as string;
    const title = String(v.title ?? "");
    const inferred = inferSkillCodesFromExam3Title(title);
    const added: string[] = [];
    const toInsert: { video_id: string; skill_code: string; skill_name: string }[] = [];

    for (const code of inferred) {
      const key = `${videoId}::${code}`;
      if (existing.has(key)) continue;
      const skillName = nameByCode.get(code) ?? code;
      toInsert.push({ video_id: videoId, skill_code: code, skill_name: skillName });
      existing.add(key);
      added.push(code);
    }

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from("video_skill_tags").insert(toInsert);
      if (insErr) throw insErr;
      rowsInserted += toInsert.length;
    }

    const hadAny = inferred.length > 0;
    if (added.length > 0) videosTagged += 1;
    perVideo.push({ id: videoId, title, added, inferred, hadAny });
  }

  console.log("\n=== 第三次段考 · 標題自動標記 video_skill_tags ===\n");
  console.log(`影片總數：${list.length}`);
  console.log(`本次新增標籤筆數：${rowsInserted}`);
  console.log(`至少新增過 1 筆的影片數：${videosTagged}\n`);

  for (const row of perVideo) {
    const after = row.inferred.length > 0 ? row.inferred.join(", ") : "（無規則命中）";
    const delta = row.added.length > 0 ? `［本次新增：${row.added.join(", ")}］` : "［本次無新增（已存在或無命中）］";
    console.log(`— ${row.title}`);
    console.log(`  推論 skill：${after} ${delta}\n`);
  }

  const noSkill = perVideo.filter((p) => !p.hadAny);
  if (noSkill.length > 0) {
    console.log("=== 規則未命中（仍無 skill）的影片 ===\n");
    for (const p of noSkill) {
      console.log(`- ${p.title} (${p.id})`);
    }
    console.log("");
  }

  const { data: finalTags, error: ftErr } = await supabase
    .from("video_skill_tags")
    .select("video_id")
    .in("video_id", videoIds);
  if (ftErr) throw ftErr;
  const withDbTag = new Set((finalTags ?? []).map((r) => r.video_id as string));
  const noDbTag = list.filter((v) => !withDbTag.has(v.id as string));
  console.log("=== 摘要 ===\n");
  console.log(`規則有命中的影片數：${perVideo.filter((p) => p.hadAny).length}`);
  console.log(`資料庫中仍完全無 video_skill_tags 的影片數：${noDbTag.length}`);
  if (noDbTag.length > 0 && noDbTag.length <= 30) {
    for (const v of noDbTag) {
      console.log(`  （無標籤）${v.title}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
