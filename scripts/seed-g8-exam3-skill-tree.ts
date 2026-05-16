/**
 * 讀取 data/g8_science_exam3_skill_tree.json，以 upsert 寫入 public.skill_tags。
 * - 只處理 JSON 內的 skill_code；不刪除、不修改第二次段考（EL/AB/CO/NE/RS 等）列。
 * - skill_tags.unit 須與 scope_units.unit_title 一致，學生技能樹 getStudentSkillTreeData 才會載入：
 *   domain=chemistry →「有機化合物」；domain=physics →「力與壓力」
 * - JSON 的「課本次單元」寫入 lesson_unit。
 *
 * 使用前請先套用 migration：20260512133000_skill_tags_lesson_metadata.sql
 *
 * 使用：npm run seed:g8-exam3-skill-tree
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

const DATA_FILE = "data/g8_science_exam3_skill_tree.json";

const SCOPE_UNIT_BY_DOMAIN: Record<string, string> = {
  chemistry: "有機化合物",
  physics: "力與壓力",
};

type SkillTreeJsonRow = {
  exam_scope: string;
  unit: string;
  category: string;
  skill_code: string;
  skill_name: string;
  skill_detail: string;
  common_mistakes: string;
  ai_detection_rule: string;
  sample_question: string;
  difficulty: string;
  domain: string;
};

function loadRows(): SkillTreeJsonRow[] {
  const path = join(process.cwd(), DATA_FILE);
  const raw = readFileSync(path, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`${DATA_FILE} 必須為 JSON 陣列`);
  return parsed as SkillTreeJsonRow[];
}

function scopeUnitForRow(r: SkillTreeJsonRow): string {
  const d = (r.domain ?? "").trim().toLowerCase();
  const mapped = SCOPE_UNIT_BY_DOMAIN[d];
  if (!mapped) {
    throw new Error(
      `[${DATA_FILE}] skill_code=${r.skill_code}：domain 須為 chemistry 或 physics（目前：${r.domain ?? ""}）`,
    );
  }
  return mapped;
}

function validateRow(r: SkillTreeJsonRow, index: number): void {
  const prefix = `[${DATA_FILE} #${index + 1}]`;
  if (!r.skill_code?.trim()) throw new Error(`${prefix} 缺少 skill_code`);
  if (!r.skill_name?.trim()) throw new Error(`${prefix} 缺少 skill_name`);
  if (!r.category?.trim()) throw new Error(`${prefix} 缺少 category`);
  if (!r.difficulty?.trim()) throw new Error(`${prefix} 缺少 difficulty`);
  const dom = (r.domain ?? "").trim().toLowerCase();
  if (dom !== "chemistry" && dom !== "physics") throw new Error(`${prefix} domain 須為 chemistry 或 physics`);
  if ((r.exam_scope ?? "").trim() !== "國二理化下學期第三次段考") {
    throw new Error(`${prefix} exam_scope 須為「國二理化下學期第三次段考」`);
  }
  scopeUnitForRow(r);
}

async function main() {
  const rows = loadRows();
  if (rows.length === 0) {
    console.error("JSON 為空");
    process.exit(1);
  }

  rows.forEach(validateRow);

  const codes = rows.map((r) => r.skill_code.trim());
  const supabase = getSupabaseAdmin();

  const { data: existing, error: selErr } = await supabase.from("skill_tags").select("code").in("code", codes);
  if (selErr) throw selErr;

  const existingSet = new Set((existing ?? []).map((x) => x.code as string));
  let toInsert = 0;
  let toUpdate = 0;
  for (const c of codes) {
    if (existingSet.has(c)) toUpdate += 1;
    else toInsert += 1;
  }

  const nChem = rows.filter((r) => r.domain.trim().toLowerCase() === "chemistry").length;
  const nPhy = rows.filter((r) => r.domain.trim().toLowerCase() === "physics").length;

  const payload = rows.map((r) => ({
    code: r.skill_code.trim(),
    name: r.skill_name.trim(),
    unit: scopeUnitForRow(r),
    category: r.category.trim(),
    difficulty: r.difficulty.trim(),
    domain: r.domain.trim(),
    lesson_unit: r.unit.trim(),
    skill_detail: r.skill_detail.trim(),
    common_mistakes: r.common_mistakes.trim(),
    ai_detection_rule: r.ai_detection_rule.trim(),
    sample_question: r.sample_question.trim(),
    exam_scope_title: r.exam_scope.trim(),
  }));

  const { error: upErr } = await supabase.from("skill_tags").upsert(payload, {
    onConflict: "code",
    ignoreDuplicates: false,
  });

  if (upErr) {
    if (upErr.message?.includes("lesson_unit") || upErr.message?.includes("skill_detail")) {
      console.error(
        "寫入失敗：資料表可能尚未套用延伸欄位。請先執行 supabase migration：`20260512133000_skill_tags_lesson_metadata.sql`",
      );
    }
    throw upErr;
  }

  console.log(`[exam3-skill-tree] 來源 ${DATA_FILE}，共 ${rows.length} 筆（chemistry ${nChem}、physics ${nPhy}）`);
  console.log(`[exam3-skill-tree] skill_tags：新增 ${toInsert} 筆、更新 ${toUpdate} 筆（僅上述 skill_code）`);
  console.log(`[exam3-skill-tree] unit（DB）：有機化合物 / 力與壓力（依 domain）；課本次單元見 lesson_unit`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
