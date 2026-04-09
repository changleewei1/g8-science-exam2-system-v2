/**
 * 同一 unit_id + youtube_video_id 若有多筆 videos（多為重複執行 import:playlists），
 * 保留最早建立的一筆，刪除其餘（CASCADE 一併刪除重複影片的 quiz／進度等）。
 * 使用：npm run dedupe:playlist-videos
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

type VidRow = {
  id: string;
  unit_id: string;
  youtube_video_id: string;
  created_at: string;
  title: string;
};

async function main() {
  const supabase = getSupabaseAdmin();
  const { data: rows, error } = await supabase
    .from("videos")
    .select("id, unit_id, youtube_video_id, created_at, title")
    .order("created_at", { ascending: true });
  if (error) throw error;
  const list = (rows ?? []) as VidRow[];

  const groups = new Map<string, VidRow[]>();
  for (const v of list) {
    const key = `${v.unit_id}\t${v.youtube_video_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(v);
  }

  let deleted = 0;
  for (const [key, vs] of groups) {
    if (vs.length <= 1) continue;
    const [, ...dupes] = vs;
    const keep = vs[0];
    console.log(
      `重複 ${vs.length} 筆：${key.split("\t")[1]} 「${keep.title.slice(0, 40)}…」→ 保留 ${keep.id}，刪除 ${dupes.length} 筆`,
    );
    for (const d of dupes) {
      const { error: dErr } = await supabase.from("videos").delete().eq("id", d.id);
      if (dErr) throw dErr;
      deleted++;
    }
  }

  console.log(
    deleted
      ? `完成：已刪除 ${deleted} 筆重複影片。`
      : "完成：未發現 unit_id+youtube_video_id 重複，無需刪除。",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
