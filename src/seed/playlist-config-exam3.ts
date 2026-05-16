/**
 * 國二理化「下學期第三次段考」YouTube 播放清單匯入設定
 * 使用：npm run import:playlists:exam3
 *
 * unitId 必須與 `supabase/migrations/20260512120000_exam_scope_spring_term_third.sql`
 * 內 `scope_units.id` 完全一致（勿與第二次段考 …000002／…000003 混用）。
 *
 * 匯入前請先對資料庫套用上述 migration（或已存在相同 id 之 exam_scope／scope_units）。
 *
 * 匯入時建立 videos + video_skill_tags + quizzes（**不**寫入 placeholder；真題由 AI 核准後 sync）。
 */
export const PLAYLIST_IMPORT_CONFIG_EXAM3 = [
  {
    unitId: "b0000001-0000-4000-8000-000000000011",
    /** 有機化合物 https://www.youtube.com/playlist?list=PLE4eQs8dZrfRwdV842kY983PGu6j1eiDb */
    playlistId: "PLE4eQs8dZrfRwdV842kY983PGu6j1eiDb",
    includeRule: { type: "all" as const },
    defaultSkillCode: "C2-11-01",
    defaultSkillName: "有機化合物的基本定義",
  },
  {
    unitId: "b0000001-0000-4000-8000-000000000012",
    /** 力與壓力 https://www.youtube.com/playlist?list=PLE4eQs8dZrfRWOJ1PJTWyfcYlrQm9tC40 */
    playlistId: "PLE4eQs8dZrfRWOJ1PJTWyfcYlrQm9tC40",
    includeRule: { type: "all" as const },
    defaultSkillCode: "P2-6-1-01",
    defaultSkillName: "力的意義與特性",
  },
] as const;
