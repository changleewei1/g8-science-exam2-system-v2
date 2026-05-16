/**
 * 第三次段考專用：從 YouTube 匯入播放清單 → 寫入第三次段考 scope 底下之 videos
 * 使用：npm run import:playlists:exam3
 *
 * 需 YOUTUBE_API_KEY、.env.local 內 Supabase（含 SUPABASE_SERVICE_ROLE_KEY）
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { getPlaylistImportService } from "../src/infrastructure/composition";
import { PLAYLIST_IMPORT_CONFIG_EXAM3 } from "../src/seed/playlist-config-exam3";

async function main() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error("請設定 YOUTUBE_API_KEY");
    process.exit(1);
  }
  const svc = getPlaylistImportService();
  for (const cfg of PLAYLIST_IMPORT_CONFIG_EXAM3) {
    console.log("[exam3] Importing playlist", cfg.playlistId, "→ unit", cfg.unitId);
    const result = await svc.importAndSeedQuizzes({
      unitId: cfg.unitId,
      playlistId: cfg.playlistId,
      includeRule: cfg.includeRule,
      youtubeApiKey: key,
      defaultSkillCode: cfg.defaultSkillCode,
      defaultSkillName: cfg.defaultSkillName,
      seedQuizPlaceholderQuestions: false,
    });
    console.log("[exam3] Imported new videos:", result.imported);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
