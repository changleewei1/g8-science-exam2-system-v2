/**
 * 影片 skill_code AI 初判（候選表）
 *
 * 用法：
 * npm run analyze:video-skills -- --playlist-url "https://www.youtube.com/playlist?list=XXXXX" --unit "反應速率"
 * npm run analyze:video-skills -- --playlist-url "..." --unit "反應速率" --dry-run
 */
import { config } from "dotenv";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

const execFileAsync = promisify(execFile);
const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

type VideoLite = { videoId: string; title: string };
type SkillLite = { code: string; name: string };

function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i < 0) return undefined;
  return process.argv[i + 1];
}

function parsePlaylistId(url: string): string {
  const u = new URL(url);
  const list = u.searchParams.get("list");
  if (!list) throw new Error("playlist-url 缺少 list 參數");
  return list;
}

function unitAliases(raw: string): string[] {
  const t = raw.trim().toLowerCase();
  if (t.includes("反應速率") || t === "reaction_rate") return ["reaction_rate", "反應速率"];
  if (t.includes("酸鹼") || t === "acid_base") return ["acid_base", "酸鹼中和"];
  return [raw];
}

async function fetchPlaylistVideos(playlistId: string, apiKey: string): Promise<VideoLite[]> {
  const out: VideoLite[] = [];
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
      items?: Array<{ snippet?: { title?: string; resourceId?: { videoId?: string } } }>;
      nextPageToken?: string;
    };
    for (const it of data.items ?? []) {
      const videoId = it.snippet?.resourceId?.videoId?.trim();
      if (!videoId) continue;
      out.push({ videoId, title: it.snippet?.title?.trim() || "(無標題)" });
    }
    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }
  return out;
}

async function fetchSubtitleByYtDlp(videoId: string): Promise<string> {
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
    return stdout.trim().slice(0, 15000);
  } catch {
    return "";
  }
}

function buildPrompt(input: {
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

async function askAi(params: {
  apiKey: string;
  model: string;
  unit: string;
  title: string;
  subtitle: string;
  skills: SkillLite[];
}): Promise<
  Array<{ suggested_skill_code: string; suggested_skill_name: string; confidence: number; reason: string }>
> {
  const prompt = buildPrompt(params);
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
  const out: Array<{ suggested_skill_code: string; suggested_skill_name: string; confidence: number; reason: string }> = [];
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

async function main() {
  const playlistUrl = arg("--playlist-url")?.trim();
  const unit = arg("--unit")?.trim();
  const dryRun = process.argv.includes("--dry-run");
  const model = arg("--model")?.trim() || "gpt-4o-mini";
  if (!playlistUrl || !unit) {
    throw new Error("請提供 --playlist-url 與 --unit");
  }

  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!youtubeApiKey) throw new Error("缺少 YOUTUBE_API_KEY");
  if (!openAiKey) throw new Error("缺少 OPENAI_API_KEY");

  const supabase = getSupabaseAdmin();
  const aliases = unitAliases(unit);
  const { data: skillsRows, error: sErr } = await supabase
    .from("skill_tags")
    .select("code, name, unit")
    .in("unit", aliases);
  if (sErr) throw sErr;
  const skills = (skillsRows ?? []).map((s) => ({ code: s.code, name: s.name }));
  if (skills.length === 0) throw new Error(`找不到單元「${unit}」對應 skill_tags`);

  const videos = await fetchPlaylistVideos(parsePlaylistId(playlistUrl), youtubeApiKey);
  const youtubeIds = videos.map((v) => v.videoId);
  const { data: dbVideos, error: vErr } = await supabase
    .from("videos")
    .select("id, youtube_video_id, title, subtitle_text")
    .in("youtube_video_id", youtubeIds);
  if (vErr) throw vErr;
  const dbByYoutube = new Map((dbVideos ?? []).map((v) => [v.youtube_video_id, v]));

  let created = 0;
  let skippedDup = 0;
  let skippedNoSubtitle = 0;
  let skippedInvalid = 0;

  for (const v of videos) {
    const dbv = dbByYoutube.get(v.videoId);
    const subtitleInDb = dbv?.subtitle_text?.trim() ?? "";
    const subtitle = subtitleInDb || (await fetchSubtitleByYtDlp(v.videoId));
    if (!subtitle) {
      skippedNoSubtitle += 1;
      continue;
    }

    const suggestions = await askAi({
      apiKey: openAiKey,
      model,
      unit,
      title: dbv?.title || v.title,
      subtitle,
      skills,
    });

    for (const s of suggestions) {
      if (!s.suggested_skill_code || !Number.isFinite(s.confidence)) {
        skippedInvalid += 1;
        continue;
      }
      const videoKey = dbv?.id ?? v.videoId;
      const { data: existed, error: exErr } = await supabase
        .from("video_skill_mapping_candidates")
        .select("id")
        .eq("video_id", videoKey)
        .eq("suggested_skill_code", s.suggested_skill_code)
        .eq("status", "pending")
        .maybeSingle();
      if (exErr && !exErr.message.includes("does not exist")) throw exErr;
      if (existed) {
        skippedDup += 1;
        continue;
      }

      if (dryRun) {
        console.log(
          `[DRY] ${v.videoId} | ${s.suggested_skill_code} | conf=${s.confidence.toFixed(2)} | ${s.reason.slice(0, 40)}...`,
        );
      } else {
        const { error: insErr } = await supabase.from("video_skill_mapping_candidates").insert({
          video_id: videoKey,
          video_title: dbv?.title || v.title,
          unit,
          suggested_skill_code: s.suggested_skill_code,
          suggested_skill_name: s.suggested_skill_name,
          confidence: s.confidence,
          reason: s.reason,
          subtitle_available: true,
          status: "pending",
        });
        if (insErr) throw insErr;
      }
      created += 1;
    }
  }

  console.log(
    `完成（dry-run=${dryRun ? "yes" : "no"}）：新增候選 ${created}，重複略過 ${skippedDup}，無字幕 ${skippedNoSubtitle}，非法輸出 ${skippedInvalid}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
