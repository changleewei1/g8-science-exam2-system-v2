/**
 * 從 YouTube 匯入播放清單影片與預設測驗（需 YOUTUBE_API_KEY、Supabase 環境變數）
 * 使用：npm run import:playlists
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { getPlaylistImportService } from "../src/infrastructure/composition";
import { PLAYLIST_IMPORT_CONFIG } from "../src/seed/playlist-config";

async function main() {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    console.error("請設定 YOUTUBE_API_KEY");
    process.exit(1);
  }
  const svc = getPlaylistImportService();
  for (const cfg of PLAYLIST_IMPORT_CONFIG) {
    console.log("Importing playlist", cfg.playlistId, "→ unit", cfg.unitId);
    const result = await svc.importAndSeedQuizzes({
      unitId: cfg.unitId,
      playlistId: cfg.playlistId,
      includeRule: cfg.includeRule,
      youtubeApiKey: key,
      defaultSkillCode: cfg.defaultSkillCode,
      defaultSkillName: cfg.defaultSkillName,
    });
    console.log("Imported videos:", result.imported);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
