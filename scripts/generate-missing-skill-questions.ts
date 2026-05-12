/**
 * 只針對未達標 skill（預設 <10 題）自動生成題目
 *
 * 用法：
 * npm run generate:missing-skills
 * npm run generate:missing-skills -- --target 10
 * npm run generate:missing-skills -- --unit reaction_rate
 * npm run generate:missing-skills -- --skill-code RS06
 *
 * 輸出：
 * data/generated_questions.json
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

const execFileAsync = promisify(execFile);
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type GeneratedQuestion = {
  unit: string;
  skill_code: string;
  difficulty: "基礎" | "進階";
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
  video_id: string;
};

type Envelope = {
  meta: {
    generated_at: string;
    target_count: number;
    considered_skills: number;
    generated_questions: number;
    skipped_duplicate: number;
    skipped_no_video: number;
    skipped_no_subtitle: number;
    unit_filter?: string;
    skill_code_filter?: string;
  };
  items: GeneratedQuestion[];
};

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。、「」；：！？,.!?:;"'()（）\[\]{}]/g, "");
}

function similarity(a: string, b: string): number {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  const aSet = new Set(na.match(/.{1,2}/g) ?? []);
  const bSet = new Set(nb.match(/.{1,2}/g) ?? []);
  if (!aSet.size || !bSet.size) return 0;
  let inter = 0;
  for (const g of aSet) if (bSet.has(g)) inter += 1;
  return inter / Math.max(aSet.size, bSet.size);
}

async function fetchSubtitleByYtDlp(youtubeVideoId: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("yt-dlp", [
      "--skip-download",
      "--write-auto-sub",
      "--sub-lang",
      "zh-TW,zh-Hant,zh,en",
      "--sub-format",
      "vtt",
      "--print",
      "requested_subtitles",
      `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    ]);
    return stdout.trim().slice(0, 12000);
  } catch {
    return "";
  }
}

function buildPrompt(input: {
  unit: string;
  skillCode: string;
  skillName: string;
  title: string;
  subtitleText: string;
  needCount: number;
}): string {
  return `你是國中理化老師。

請根據以下影片字幕內容，生成 ${Math.min(input.needCount, 3)} 題選擇題。

要求：
1. 題目必須貼近影片內容
2. 適合國中學生
3. 每題 4 個選項
4. 只有 1 個正確答案
5. explanation 要有教學性
6. 不要出現模糊或無關題目

題型盡量分布：
- 基礎理解
- 概念應用
- 常見錯誤

請只輸出 JSON 陣列，每個元素包含：
unit, skill_code, difficulty, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation

固定條件：
- unit = "${input.unit}"
- skill_code = "${input.skillCode}"
- difficulty 只能是「基礎」或「進階」
- correct_answer 只能是 A/B/C/D

技能名稱：${input.skillName}
影片標題：${input.title}
影片字幕（節錄）：${input.subtitleText.slice(0, 12000)}
`;
}

async function generateQuestionsByOpenAI(params: {
  apiKey: string;
  model: string;
  unit: string;
  skillCode: string;
  skillName: string;
  title: string;
  subtitleText: string;
  needCount: number;
}): Promise<Omit<GeneratedQuestion, "video_id">[]> {
  const prompt = buildPrompt(params);
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.6,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI 失敗 ${res.status}: ${body.slice(0, 260)}`);
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const txt = (data.choices?.[0]?.message?.content ?? "[]")
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const rows = JSON.parse(txt) as Array<Record<string, unknown>>;
  if (!Array.isArray(rows)) return [];

  const out: Omit<GeneratedQuestion, "video_id">[] = [];
  for (const r of rows) {
    const item: Omit<GeneratedQuestion, "video_id"> = {
      unit: String(r.unit ?? "").trim(),
      skill_code: String(r.skill_code ?? "").trim().toUpperCase(),
      difficulty: String(r.difficulty ?? "基礎").trim() === "進階" ? "進階" : "基礎",
      question_text: String(r.question_text ?? "").trim(),
      choice_a: String(r.choice_a ?? "").trim(),
      choice_b: String(r.choice_b ?? "").trim(),
      choice_c: String(r.choice_c ?? "").trim(),
      choice_d: String(r.choice_d ?? "").trim(),
      correct_answer: String(r.correct_answer ?? "").trim().toUpperCase() as "A" | "B" | "C" | "D",
      explanation: String(r.explanation ?? "").trim(),
    };
    if (
      item.unit &&
      item.skill_code &&
      item.question_text &&
      item.choice_a &&
      item.choice_b &&
      item.choice_c &&
      item.choice_d &&
      ["A", "B", "C", "D"].includes(item.correct_answer) &&
      item.explanation
    ) {
      out.push(item);
    }
  }
  return out;
}

async function main() {
  const targetCount = Number(arg("--target") ?? "10");
  const onlyUnit = arg("--unit")?.trim();
  const onlySkillCode = arg("--skill-code")?.trim().toUpperCase();
  const model = arg("--model")?.trim() || "gpt-4o-mini";
  const outFile = arg("--out")?.trim() || "data/generated_questions.json";

  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) throw new Error("缺少 OPENAI_API_KEY");

  const supabase = getSupabaseAdmin();
  const normalizedUnit = (onlyUnit ?? "").trim().toLowerCase();
  const { data: skillTags, error: sErr } = await supabase
    .from("skill_tags")
    .select("code, name, unit")
    .order("code", { ascending: true });
  if (sErr) throw sErr;

  const { data: bankRows, error: bErr } = await supabase
    .from("question_bank_items")
    .select("skill_code, question_text");
  if (bErr) throw bErr;

  const countBySkill = new Map<string, number>();
  const existingBySkill = new Map<string, string[]>();
  for (const r of bankRows ?? []) {
    const code = r.skill_code.toUpperCase();
    countBySkill.set(code, (countBySkill.get(code) ?? 0) + 1);
    const cur = existingBySkill.get(code) ?? [];
    cur.push(r.question_text);
    existingBySkill.set(code, cur);
  }

  const targetSkills = (skillTags ?? [])
    .filter((s) => (!onlyUnit ? true : s.unit === onlyUnit || s.unit === onlyUnit.toLowerCase()))
    .filter((s) => (!onlySkillCode ? true : s.code.toUpperCase() === onlySkillCode))
    .map((s) => ({
      code: s.code.toUpperCase(),
      name: s.name || s.code,
      unit: s.unit,
      currentCount: countBySkill.get(s.code.toUpperCase()) ?? 0,
    }))
    .filter((s) => s.currentCount < targetCount);

  const { data: scopeUnitRows, error: suErr } = await supabase
    .from("scope_units")
    .select("id, unit_code, unit_title");
  if (suErr) throw suErr;

  const fallbackUnitIds = (scopeUnitRows ?? [])
    .filter((u) => {
      const code = (u.unit_code ?? "").toLowerCase();
      const title = (u.unit_title ?? "").toLowerCase();
      if (!normalizedUnit) return false;
      if (code === normalizedUnit) return true;
      if (normalizedUnit === "acid_base" && title.includes("酸鹼")) return true;
      if (normalizedUnit === "reaction_rate" && title.includes("反應速率")) return true;
      return false;
    })
    .map((u) => u.id);

  let fallbackVideosByUnit: Array<{
    id: string;
    youtube_video_id: string | null;
    title: string;
    subtitle_text: string | null;
  }> = [];
  if (fallbackUnitIds.length > 0) {
    const { data: vids, error: fvErr } = await supabase
      .from("videos")
      .select("id, youtube_video_id, title, subtitle_text")
      .in("unit_id", fallbackUnitIds)
      .order("sort_order", { ascending: true });
    if (fvErr) throw fvErr;
    fallbackVideosByUnit = vids ?? [];
  }

  const output: GeneratedQuestion[] = [];
  let skippedDup = 0;
  let skippedNoVideo = 0;
  let skippedNoSubtitle = 0;
  let usedFallbackVideos = 0;

  for (const skill of targetSkills) {
    const need = targetCount - skill.currentCount;
    if (need <= 0) continue;

    const { data: tags, error: tErr } = await supabase
      .from("video_skill_tags")
      .select("video_id")
      .eq("skill_code", skill.code);
    if (tErr) throw tErr;
    const videoIds = (tags ?? []).map((t) => t.video_id);
    let videos: Array<{ id: string; youtube_video_id: string | null; title: string; subtitle_text: string | null }> =
      [];
    if (videoIds.length > 0) {
      const { data: taggedVideos, error: vErr } = await supabase
        .from("videos")
        .select("id, youtube_video_id, title, subtitle_text")
        .in("id", videoIds)
        .order("sort_order", { ascending: true });
      if (vErr) throw vErr;
      videos = taggedVideos ?? [];
    } else if (fallbackVideosByUnit.length > 0) {
      videos = fallbackVideosByUnit;
      usedFallbackVideos += 1;
    }

    if (videos.length === 0) {
      skippedNoVideo += 1;
      continue;
    }

    let remain = need;
    for (const v of videos ?? []) {
      if (remain <= 0) break;
      let subtitle = (v.subtitle_text ?? "").trim();
      if (!subtitle && v.youtube_video_id) {
        subtitle = await fetchSubtitleByYtDlp(v.youtube_video_id);
      }
      if (!subtitle) {
        skippedNoSubtitle += 1;
        continue;
      }

      const generated = await generateQuestionsByOpenAI({
        apiKey: openAiKey,
        model,
        unit: skill.unit,
        skillCode: skill.code,
        skillName: skill.name,
        title: v.title,
        subtitleText: subtitle,
        needCount: remain,
      });

      for (const q of generated) {
        if (remain <= 0) break;
        const dupDb = (existingBySkill.get(skill.code) ?? []).some((oldQ) => similarity(oldQ, q.question_text) >= 0.82);
        const dupRun = output.some((oldQ) => oldQ.skill_code === skill.code && similarity(oldQ.question_text, q.question_text) >= 0.82);
        if (dupDb || dupRun) {
          skippedDup += 1;
          continue;
        }
        output.push({ ...q, video_id: v.id });
        remain -= 1;
      }
    }
  }

  const envelope: Envelope = {
    meta: {
      generated_at: new Date().toISOString(),
      target_count: targetCount,
      considered_skills: targetSkills.length,
      generated_questions: output.length,
      skipped_duplicate: skippedDup,
      skipped_no_video: skippedNoVideo,
      skipped_no_subtitle: skippedNoSubtitle,
      unit_filter: onlyUnit,
      skill_code_filter: onlySkillCode,
    },
    items: output,
  };

  const outPath = join(process.cwd(), outFile);
  writeFileSync(outPath, JSON.stringify(envelope, null, 2), "utf8");
  console.log(`完成：已為未達標 skill 生成 ${output.length} 題 → ${outFile}`);
  console.log(
    `統計：skills=${targetSkills.length}、重複略過=${skippedDup}、無影片=${skippedNoVideo}、無字幕=${skippedNoSubtitle}、使用單元影片回退=${usedFallbackVideos}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
