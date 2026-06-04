import type { SubjectServiceContext } from "@/lib/services/subject-context";

/** 影片學習（播放清單、字幕、觀看紀錄、影片測驗）— 實作仍分散於既有 route／domain，此為模組邊界錨點。 */
export type VideoLearningContext = SubjectServiceContext & {
  videoId?: string | null;
};

export function assertVideoLearningSubject(_ctx: VideoLearningContext): void {
  // 預留：依 subjectKey 切換資料來源或 RLS
}
