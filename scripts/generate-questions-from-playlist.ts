/**
 * 影片→題庫自動補強（生成腳本）
 *
 * 用法：
 *   npm run generate:questions -- --playlist-url "https://www.youtube.com/playlist?list=XXXXX"
 *   npm run generate:questions -- --playlist-url "..." --skill-code RS06
 *   npm run generate:questions -- --playlist-url "..." --out data/generated_questions.json
 *
 * 環境變數：
 * - YOUTUBE_API_KEY（必填，用於播放清單影片列表）
 * - OPENAI_API_KEY（必填，用於題目生成）
 * - NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY（必填，用於查 skill 與比對重複）
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

type Args = {
  playlistUrl: string;
  outFile: string;
  skillCode?: string;
  model: string;
};

type VideoLite = {
  videoId: string;
  title: string;
};

type ExistingBankRow = {
  question_text: string;
  skill_code: string;
};

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

type GeneratedEnvelope = {
  meta: {
    playlist_url: string;
    generated_at: string;
    total_videos: number;
    total_generated: number;
    skipped_no_skill: number;
    skipped_no_subtitle: number;
    skipped_duplicate: number;
    filtered_skill_code?: string;
  };
  items: GeneratedQuestion[];
};

function getArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function parseArgs(): Args {
  const playlistUrl = getArg("--playlist-url")?.trim();
  if (!playlistUrl) {
    throw new Error("請提供 --playlist-url");
  }
  const outFile = getArg("--out")?.trim() || "data/generated_questions.json";
  const skillCode = getArg("--skill-code")?.trim().toUpperCase();
  const model = getArg("--model")?.trim() || "gpt-4o-mini";
  return { playlistUrl, outFile, skillCode, model };
}

function parsePlaylistId(url: string): string {
  try {
    const u = new URL(url);
    const list = u.searchParams.get("list")?.trim();
    if (!list) throw new Error("missing list");
    return list;
  } catch {
    throw new Error("playlist URL 格式錯誤，需含 ?list=...");
  }
}

async function fetchPlaylistVideos(playlistId: string, apiKey: string): Promise<VideoLite[]> {
  const videos: VideoLite[] = [];
  let pageToken = "";

  while (true) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube API 失敗：${res.status}`);
    const data = (await res.json()) as {
      items?: Array<{
        snippet?: {
          title?: string;
          resourceId?: { videoId?: string };
        };
      }>;
      nextPageToken?: string;
    };

    for (const item of data.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId?.trim();
      const title = item.snippet?.title?.trim() || "(無標題)";
      if (videoId) videos.push({ videoId, title });
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return videos;
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

async function tryFetchSubtitleWithYtDlp(videoId: string): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
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
      url,
    ]);
    return stdout.trim().slice(0, 12000);
  } catch {
    return "";
  }
}

function buildPrompt(input: {
  unit: string;
  skillCode: string;
  title: string;
  subtitleText: string;
}): string {
  const { unit, skillCode, title, subtitleText } = input;
  return `你是國中理化老師。

請根據以下影片字幕內容，生成 3 題選擇題。

要求：
1. 題目必須貼近影片內容
2. 適合國中學生
3. 每題 4 個選項
4. 只有 1 個正確答案
5. explanation 要有教學性
6. 不要出現模糊或無關題目

題型：
- 1 題基礎理解
- 1 題概念應用
- 1 題常見錯誤

請只輸出 JSON 陣列，陣列中每個元素需含欄位：
unit, skill_code, difficulty, question_text, choice_a, choice_b, choice_c, choice_d, correct_answer, explanation

其中：
- unit 固定為「${unit}」
- skill_code 固定為「${skillCode}」
- difficulty 僅能是「基礎」或「進階」
- correct_answer 只能是 A/B/C/D

影片標題：${title}
影片字幕（可能節錄）：${subtitleText.slice(0, 12000)}
`;
}

function parseGeneratedJson(text: string): GeneratedQuestion[] {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  const arr = JSON.parse(cleaned) as Array<Record<string, unknown>>;
  if (!Array.isArray(arr)) return [];
  const out: GeneratedQuestion[] = [];
  for (const row of arr) {
    const q = {
      unit: String(row.unit ?? "").trim(),
      skill_code: String(row.skill_code ?? "").trim().toUpperCase(),
      difficulty: String(row.difficulty ?? "基礎").trim() as "基礎" | "進階",
      question_text: String(row.question_text ?? "").trim(),
      choice_a: String(row.choice_a ?? "").trim(),
      choice_b: String(row.choice_b ?? "").trim(),
      choice_c: String(row.choice_c ?? "").trim(),
      choice_d: String(row.choice_d ?? "").trim(),
      correct_answer: String(row.correct_answer ?? "").trim().toUpperCase() as "A" | "B" | "C" | "D",
      explanation: String(row.explanation ?? "").trim(),
      video_id: "",
    };
    if (
      q.unit &&
      q.skill_code &&
      q.question_text &&
      q.choice_a &&
      q.choice_b &&
      q.choice_c &&
      q.choice_d &&
      ["A", "B", "C", "D"].includes(q.correct_answer) &&
      q.explanation
    ) {
      if (q.difficulty !== "基礎" && q.difficulty !== "進階") q.difficulty = "基礎";
      out.push(q);
    }
  }
  return out;
}

async function generateThreeQuestions(params: {
  apiKey: string;
  model: string;
  unit: string;
  skillCode: string;
  title: string;
  subtitleText: string;
}): Promise<GeneratedQuestion[]> {
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
    throw new Error(`OpenAI 失敗 ${res.status}: ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content ?? "[]";
  return parseGeneratedJson(text);
}

async function main() {
  const args = parseArgs();
  const playlistId = parsePlaylistId(args.playlistUrl);
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!youtubeApiKey) throw new Error("缺少 YOUTUBE_API_KEY");
  if (!openAiKey) throw new Error("缺少 OPENAI_API_KEY");

  const supabase = getSupabaseAdmin();
  const videos = await fetchPlaylistVideos(playlistId, youtubeApiKey);
  if (videos.length === 0) throw new Error("播放清單沒有影片");

  const videoIds = videos.map((v) => v.videoId);

  const { data: videoRows, error: vErr } = await supabase
    .from("videos")
    .select("id, youtube_video_id, title, subtitle_text, unit_id")
    .in("youtube_video_id", videoIds);
  if (vErr) throw vErr;

  const dbVideoIds = (videoRows ?? []).map((v) => v.id);
  const { data: tagRows, error: tagErr } = await supabase
    .from("video_skill_tags")
    .select("video_id, skill_code")
    .in("video_id", dbVideoIds);
  if (tagErr) throw tagErr;

  const { data: unitRows, error: uErr } = await supabase
    .from("scope_units")
    .select("id, unit_title");
  if (uErr) throw uErr;

  const { data: existingRows, error: eErr } = await supabase
    .from("question_bank_items")
    .select("question_text, skill_code");
  if (eErr) throw eErr;
  const existing = (existingRows ?? []) as ExistingBankRow[];

  const tagsByVideo = new Map<string, string[]>();
  (tagRows ?? []).forEach((r) => {
    const cur = tagsByVideo.get(r.video_id) ?? [];
    cur.push(r.skill_code.toUpperCase());
    tagsByVideo.set(r.video_id, cur);
  });

  const mapByYoutube = new Map<string, { dbVideoId: string; title: string; subtitle: string; unitTitle: string }>();
  const unitNameById = new Map((unitRows ?? []).map((u) => [u.id, u.unit_title]));
  for (const dbv of videoRows ?? []) {
    const yid = dbv.youtube_video_id?.trim();
    if (!yid) continue;
    mapByYoutube.set(yid, {
      dbVideoId: dbv.id,
      title: dbv.title,
      subtitle: dbv.subtitle_text ?? "",
      unitTitle: unitNameById.get(dbv.unit_id) ?? "未分類單元",
    });
  }

  const output: GeneratedQuestion[] = [];
  let skippedNoSkill = 0;
  let skippedNoSubtitle = 0;
  let skippedDuplicate = 0;

  for (const v of videos) {
    const dbVideo = mapByYoutube.get(v.videoId);
    if (!dbVideo) continue;
    const skillCodes = tagsByVideo.get(dbVideo.dbVideoId) ?? [];
    const selectedSkill = args.skillCode
      ? skillCodes.find((s) => s === args.skillCode)
      : skillCodes[0];
    if (!selectedSkill) {
      skippedNoSkill += 1;
      continue;
    }

    let subtitle = dbVideo.subtitle?.trim() ?? "";
    if (!subtitle) {
      subtitle = await tryFetchSubtitleWithYtDlp(v.videoId);
    }
    if (!subtitle) {
      skippedNoSubtitle += 1;
      continue;
    }

    const generated = await generateThreeQuestions({
      apiKey: openAiKey,
      model: args.model,
      unit: dbVideo.unitTitle,
      skillCode: selectedSkill,
      title: dbVideo.title || v.title,
      subtitleText: subtitle,
    });

    for (const q of generated) {
      q.video_id = dbVideo.dbVideoId;
      const dupInDb = existing.some(
        (e) => e.skill_code.toUpperCase() === q.skill_code && similarity(e.question_text, q.question_text) >= 0.82,
      );
      const dupInRun = output.some(
        (e) => e.skill_code === q.skill_code && similarity(e.question_text, q.question_text) >= 0.82,
      );
      if (dupInDb || dupInRun) {
        skippedDuplicate += 1;
        continue;
      }
      output.push(q);
    }
  }

  const envelope: GeneratedEnvelope = {
    meta: {
      playlist_url: args.playlistUrl,
      generated_at: new Date().toISOString(),
      total_videos: videos.length,
      total_generated: output.length,
      skipped_no_skill: skippedNoSkill,
      skipped_no_subtitle: skippedNoSubtitle,
      skipped_duplicate: skippedDuplicate,
      filtered_skill_code: args.skillCode,
    },
    items: output,
  };

  const outPath = join(process.cwd(), args.outFile);
  writeFileSync(outPath, JSON.stringify(envelope, null, 2), "utf8");

  console.log(`完成：已輸出 ${output.length} 題到 ${args.outFile}`);
  console.log(
    `統計：影片 ${videos.length} 支，無 skill ${skippedNoSkill}，無字幕 ${skippedNoSubtitle}，重複略過 ${skippedDuplicate}`,
  );
  if (args.skillCode) {
    console.log(`已啟用 skill 篩選：${args.skillCode}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
