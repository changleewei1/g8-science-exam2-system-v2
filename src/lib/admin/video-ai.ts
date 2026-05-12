import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export type SkillLite = { code: string; name: string };

export async function fetchSubtitleByYtDlp(videoId: string): Promise<string> {
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
      `https://www.youtube.com/watch?v=${videoId}`,
    ]);
    return stdout.trim().slice(0, 24000);
  } catch {
    return "";
  }
}

export function unitAliasesForSkillTags(unitTitle: string): string[] {
  const t = unitTitle.trim().toLowerCase();
  if (t.includes("反應速率") || t === "reaction_rate") return ["reaction_rate", "反應速率"];
  if (t.includes("酸鹼") || t.includes("中和") || t === "acid_base") return ["acid_base", "酸鹼中和"];
  return [unitTitle.trim()];
}

export function buildSkillSuggestionPrompt(input: {
  unit: string;
  title: string;
  subtitle: string;
  skills: SkillLite[];
}): string {
  const skillRows = input.skills.map((s) => `${s.code} ${s.name}`).join("\n");
  return `你是國中理化教學助理。請依據影片標題與字幕，判斷最可能的 skill_code（1~3 個）。

單元：${input.unit}
可選技能清單（只能從這裡選）：
${skillRows}

請輸出 JSON 陣列，每個元素格式：
{
  "suggested_skill_code": "RS06",
  "suggested_skill_name": "控制變因的判斷",
  "confidence": 0.82,
  "reason": "..."
}

規則：
1) confidence 介於 0~1
2) 最多 3 個、最少 1 個
3) 不可輸出清單外 skill_code

影片標題：${input.title}
影片字幕（節錄）：${input.subtitle.slice(0, 12000)}
`;
}

export async function suggestSkillsWithOpenAI(params: {
  apiKey: string;
  model: string;
  unit: string;
  title: string;
  subtitle: string;
  skills: SkillLite[];
}): Promise<Array<{ suggested_skill_code: string; suggested_skill_name: string; confidence: number; reason: string }>> {
  const prompt = buildSkillSuggestionPrompt(params);
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.3,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI 失敗 ${res.status}: ${body.slice(0, 260)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const txt = (json.choices?.[0]?.message?.content ?? "[]")
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const arr = JSON.parse(txt) as Array<Record<string, unknown>>;
  if (!Array.isArray(arr)) return [];
  const allowed = new Set(params.skills.map((s) => s.code));
  const out: Array<{
    suggested_skill_code: string;
    suggested_skill_name: string;
    confidence: number;
    reason: string;
  }> = [];
  for (const r of arr) {
    const code = String(r.suggested_skill_code ?? "").trim().toUpperCase();
    const name = String(r.suggested_skill_name ?? "").trim();
    const conf = Number(r.confidence ?? 0);
    const reason = String(r.reason ?? "").trim();
    if (!allowed.has(code)) continue;
    if (!reason) continue;
    out.push({
      suggested_skill_code: code,
      suggested_skill_name: name || params.skills.find((s) => s.code === code)?.name || code,
      confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0,
      reason,
    });
    if (out.length >= 3) break;
  }
  return out;
}

function buildQuestionPrompt(input: {
  unit: string;
  skillCode: string;
  skillName: string;
  title: string;
  subtitleText: string;
  count: number;
}): string {
  return `你是國二理化題庫命題助教。請根據「影片標題」與「字幕內容」出 ${input.count} 題四選單選題，對應能力代碼 ${input.skillCode}。
題型儘量分布在：基礎理解、概念應用、常見錯誤。
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

export type GeneratedMcqRow = {
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
};

export async function generateMcqsWithOpenAI(params: {
  apiKey: string;
  model: string;
  unit: string;
  skillCode: string;
  skillName: string;
  title: string;
  subtitleText: string;
  count: number;
}): Promise<GeneratedMcqRow[]> {
  const prompt = buildQuestionPrompt(params);
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.55,
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

  const out: GeneratedMcqRow[] = [];
  for (const r of rows) {
    const difficulty =
      String(r.difficulty ?? "基礎").trim() === "進階" ? ("進階" as const) : ("基礎" as const);
    const ca = String(r.correct_answer ?? "").trim().toUpperCase() as "A" | "B" | "C" | "D";
    const item: GeneratedMcqRow = {
      unit: String(r.unit ?? "").trim() || params.unit,
      skill_code: String(r.skill_code ?? "").trim().toUpperCase(),
      difficulty,
      question_text: String(r.question_text ?? "").trim(),
      choice_a: String(r.choice_a ?? "").trim(),
      choice_b: String(r.choice_b ?? "").trim(),
      choice_c: String(r.choice_c ?? "").trim(),
      choice_d: String(r.choice_d ?? "").trim(),
      correct_answer: ca,
      explanation: String(r.explanation ?? "").trim(),
    };
    if (
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
