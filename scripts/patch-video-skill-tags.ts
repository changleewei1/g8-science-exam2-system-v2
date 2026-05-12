/**
 * 安全補齊 video_skill_tags（預設 dry-run）
 *
 * 用法：
 *   npm run patch:video-skills
 *   npm run patch:video-skills -- --apply
 *
 * 規則：
 * - 先用 youtube_video_id 找 videos.id
 * - 若 video_skill_tags 已存在同 video_id + skill_code，則略過
 * - 不刪除、不覆蓋既有資料
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

type Mapping = {
  youtube_video_id: string;
  skill_code: string;
};

const MAPPINGS: Mapping[] = [
  { youtube_video_id: "AJ0LttrIFrE", skill_code: "AB01" },
];

function normalizeSkillCode(s: string): string {
  return s.trim().toUpperCase();
}

async function main() {
  const apply = process.argv.includes("--apply");
  const supabase = getSupabaseAdmin();

  console.log(`[patch:video-skills] mode=${apply ? "APPLY" : "DRY-RUN"}`);

  let foundVideos = 0;
  let inserted = 0;
  let skippedExists = 0;
  let missingVideos = 0;
  let missingSkills = 0;

  for (const m of MAPPINGS) {
    const youtubeId = m.youtube_video_id.trim();
    const skillCode = normalizeSkillCode(m.skill_code);

    const { data: video, error: vErr } = await supabase
      .from("videos")
      .select("id, youtube_video_id, title")
      .eq("youtube_video_id", youtubeId)
      .maybeSingle();
    if (vErr) throw vErr;

    if (!video) {
      missingVideos += 1;
      console.warn(`[MISS] videos.youtube_video_id not found: ${youtubeId}`);
      continue;
    }
    foundVideos += 1;

    const { data: skill, error: sErr } = await supabase
      .from("skill_tags")
      .select("code, name")
      .eq("code", skillCode)
      .maybeSingle();
    if (sErr) throw sErr;
    if (!skill) {
      missingSkills += 1;
      console.warn(`[MISS] skill_tags.code not found: ${skillCode}`);
      continue;
    }

    const { data: existed, error: exErr } = await supabase
      .from("video_skill_tags")
      .select("id")
      .eq("video_id", video.id)
      .eq("skill_code", skillCode)
      .maybeSingle();
    if (exErr) throw exErr;

    if (existed) {
      skippedExists += 1;
      console.log(`[SKIP] already exists: ${youtubeId} -> ${skillCode}`);
      continue;
    }

    console.log(`[ADD] ${youtubeId} (${video.title}) -> ${skillCode} ${skill.name}`);
    if (!apply) continue;

    const { error: insErr } = await supabase.from("video_skill_tags").insert({
      video_id: video.id,
      skill_code: skillCode,
      skill_name: skill.name || skillCode,
    });
    if (insErr) throw insErr;
    inserted += 1;
  }

  console.log("");
  console.log(
    `summary: foundVideos=${foundVideos}, inserted=${inserted}, skippedExists=${skippedExists}, missingVideos=${missingVideos}, missingSkills=${missingSkills}`,
  );
  if (missingVideos > 0) {
    console.log(
      "提示：若 videos 沒有該影片，請先執行 npm run import:playlists（或補一支匯入單支影片的腳本）。",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

