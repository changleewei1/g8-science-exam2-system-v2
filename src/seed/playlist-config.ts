/**
 * YouTube 播放清單匯入設定（供 npm run import:playlists 使用）
 *
 * unitId 必須與 supabase/seed.sql 的 scope_units.id 完全一致。
 * - 酸鹼中和（對應 skill_tags 領域 acid_base）→ …000002
 * - 反應速率（對應 skill_tags 領域 reaction_rate）→ …000003
 *
 * 匯入前請先執行 seed.sql（或 seed_prereq_import.sql），否則會出現 FK：unit_id 不在 scope_units。
 *
 * defaultSkillCode 須存在於 skill_tags（見 supabase/seed.sql）
 */
export const PLAYLIST_IMPORT_CONFIG = [
  {
    /** 酸鹼中和單元（acid_base） */
    unitId: "b0000001-0000-4000-8000-000000000002",
    playlistId: "PLE4eQs8dZrfQIa07fxKo77-u0xShE0jEG",
    includeRule: { type: "all" as const },
    defaultSkillCode: "EL01",
    defaultSkillName: "電解質的基本概念",
  },
  {
    /**
     * 反應速率單元（reaction_rate）
     * 播放清單：理化-國中-化學反應速率
     * https://www.youtube.com/playlist?list=PLE4eQs8dZrfRkacWcR80zWae-negWNdrH
     */
    unitId: "b0000001-0000-4000-8000-000000000003",
    playlistId: "PLE4eQs8dZrfRkacWcR80zWae-negWNdrH",
    includeRule: { type: "all" as const },
    defaultSkillCode: "RS01",
    defaultSkillName: "反應速率的意義",
  },
] as const;
