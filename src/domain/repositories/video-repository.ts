import type { Video } from "@/domain/entities";

export interface VideoRepository {
  findById(id: string): Promise<Video | null>;
  findByUnitId(unitId: string): Promise<Video[]>;
  /** 同一單元＋YouTube 影片 id（若重複匯入可能多筆；取最早建立） */
  findEarliestByUnitIdAndYoutubeVideoId(
    unitId: string,
    youtubeVideoId: string,
  ): Promise<Video | null>;
  /** 建立任務時選片用 */
  findAllActive(): Promise<Video[]>;
  /** 後台任務指派：含停用影片，避免清單為空或編輯時選項遺失 */
  findAllForAdmin(): Promise<Video[]>;
  insertMany(videos: VideoInsert[]): Promise<void>;
  insertReturningId(video: VideoInsert): Promise<string>;
}

export type VideoInsert = {
  id?: string;
  unit_id: string;
  youtube_video_id: string;
  playlist_id: string | null;
  video_order: number | null;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  subtitle_text: string | null;
  sort_order: number;
  is_active: boolean;
};
