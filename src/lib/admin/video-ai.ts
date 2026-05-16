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
  if (t === "有機化合物") return ["有機化合物"];
  if (t === "力與壓力") return ["力與壓力"];
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

export type Exam3SkillContext = {
  code: string;
  name: string;
  skill_detail: string | null;
  sample_question: string | null;
  common_mistakes: string | null;
};

function buildExam3VideoComprehensionPrompt(input: {
  unitTitle: string;
  title: string;
  subtitleText: string;
  skills: Exam3SkillContext[];
}): string {
  const skillBlock = input.skills
    .map(
      (s) =>
        `- ${s.code} ${s.name}
  學習重點：${(s.skill_detail ?? "").trim() || "（無）"}
  常見迷思：${(s.common_mistakes ?? "").trim() || "（無）"}
  範例方向：${(s.sample_question ?? "").trim() || "（無）"}`,
    )
    .join("\n\n");

  return `你是國二理化命題老師。請依「影片標題」與「字幕」並結合下方技能樹，出 **恰好 3 題** 四選單選題（純文字），用來確認學生是否理解本片重點。

影片大單元：${input.unitTitle}
影片標題：${input.title}
字幕節錄：${input.subtitleText.slice(0, 12000)}

技能與教學提示（每題必須對應其中一個 skill_code；三題盡量涵蓋不同技能，若技能少於 3 個可重複但題幹須明顯不同）：
${skillBlock}

出題原則：
1. 三題須明確對應三種取向（請在題幹語氣或解析中可看出區隔）：第 1 題「基礎觀念」、第 2 題「常見迷思／辨析」、第 3 題「生活情境應用」。
2. 題幹須具體、能獨立理解，**禁止**使用「請依據本影片內容選出最適當的答案」或任何不交代考點的泛用句；**禁止**將選項寫成「選項 A／B／C／D」等占位文字。
3. 選項要有鑑別度；explanation 簡短說明為何正確。

請 **只輸出 JSON 陣列（長度恰好 3）**，每個元素欄位：
unit, skill_code, difficulty, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation
- unit 固定為：「${input.unitTitle}」
- skill_code 必須與上方清單的代碼 **完全一致**（含大小寫與連字號）
- difficulty 只能是「基礎」或「進階」
- correct_answer 只能是 A/B/C/D
`;
}

function parseGeneratedMcqRows(
  rows: Array<Record<string, unknown>>,
  unitFallback: string,
): GeneratedMcqRow[] {
  const out: GeneratedMcqRow[] = [];
  for (const r of rows) {
    const difficulty =
      String(r.difficulty ?? "基礎").trim() === "進階" ? ("進階" as const) : ("基礎" as const);
    const ca = String(r.correct_answer ?? "").trim().toUpperCase() as "A" | "B" | "C" | "D";
    const item: GeneratedMcqRow = {
      unit: String(r.unit ?? "").trim() || unitFallback,
      skill_code: String(r.skill_code ?? "").trim(),
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

/** 第三次段考：每部影片固定 3 題候選（一次 API） */
export async function generateExam3ThreeMcqsWithOpenAI(params: {
  apiKey: string;
  model: string;
  unitTitle: string;
  title: string;
  subtitleText: string;
  skills: Exam3SkillContext[];
}): Promise<GeneratedMcqRow[]> {
  const prompt = buildExam3VideoComprehensionPrompt(params);
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${params.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: params.model,
      temperature: 0.5,
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
  const allowed = new Set(params.skills.map((s) => s.code));
  const parsed = parseGeneratedMcqRows(rows, params.unitTitle).filter((q) => allowed.has(q.skill_code));
  return parsed.slice(0, 3);
}
