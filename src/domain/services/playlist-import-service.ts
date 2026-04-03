import type {
  QuizInsert,
  QuizQuestionInsert,
  QuizQuestionRepository,
  QuizRepository,
  VideoInsert,
  VideoRepository,
  VideoSkillTagInsert,
  VideoSkillTagRepository,
} from "@/domain/repositories";

export type IncludeRule =
  | { type: "all" }
  | { type: "range"; start: number; end: number };

export type PlaylistItem = {
  youtubeVideoId: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  /** 播放清單中的順序（1-based，與 YouTube 播放清單編號一致） */
  playlistPosition: number;
  durationSeconds: number | null;
};

export type ImportPlaylistInput = {
  unitId: string;
  playlistId: string;
  includeRule: IncludeRule;
  youtubeApiKey: string;
  /** 每支影片預設標籤（可選） */
  defaultSkillCode?: string;
  defaultSkillName?: string;
};

/**
 * 從 YouTube Data API v3 匯入播放清單，並建立 videos、quizzes、預設題目骨架。
 */
export class PlaylistImportService {
  constructor(
    private readonly videoRepo: VideoRepository,
    private readonly videoSkillRepo: VideoSkillTagRepository,
    private readonly quizRepo: QuizRepository,
    private readonly quizQuestionRepo: QuizQuestionRepository,
  ) {}

  async fetchPlaylistItems(
    playlistId: string,
    apiKey: string,
    includeRule: IncludeRule,
  ): Promise<PlaylistItem[]> {
    const out: PlaylistItem[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
      url.searchParams.set("part", "snippet,contentDetails");
      url.searchParams.set("playlistId", playlistId);
      url.searchParams.set("maxResults", "50");
      url.searchParams.set("key", apiKey);
      if (pageToken) url.searchParams.set("pageToken", pageToken);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`YouTube playlistItems failed: ${res.status} ${t}`);
      }
      const json = (await res.json()) as {
        items?: Array<{
          snippet?: {
            title?: string;
            description?: string;
            thumbnails?: { medium?: { url?: string } };
            resourceId?: { videoId?: string };
            position?: number;
          };
          contentDetails?: { videoId?: string };
        }>;
        nextPageToken?: string;
      };
      const items = json.items ?? [];
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const vid = it.contentDetails?.videoId ?? it.snippet?.resourceId?.videoId;
        if (!vid) continue;
        const position =
          typeof it.snippet?.position === "number"
            ? it.snippet.position + 1
            : out.length + 1;
        const title = it.snippet?.title ?? "(無標題)";
        const description = it.snippet?.description ?? null;
        const thumbnailUrl = it.snippet?.thumbnails?.medium?.url ?? null;
        out.push({
          youtubeVideoId: vid,
          title,
          description,
          thumbnailUrl,
          playlistPosition: position,
          durationSeconds: null,
        });
      }
      pageToken = json.nextPageToken;
    } while (pageToken);

    out.sort((a, b) => a.playlistPosition - b.playlistPosition);

    if (includeRule.type === "all") return out;
    return out.filter(
      (x) => x.playlistPosition >= includeRule.start && x.playlistPosition <= includeRule.end,
    );
  }

  async enrichDurations(items: PlaylistItem[], apiKey: string): Promise<void> {
    const ids = items.map((x) => x.youtubeVideoId);
    const chunk = 50;
    for (let i = 0; i < ids.length; i += chunk) {
      const part = ids.slice(i, i + chunk);
      const url = new URL("https://www.googleapis.com/youtube/v3/videos");
      url.searchParams.set("part", "contentDetails");
      url.searchParams.set("id", part.join(","));
      url.searchParams.set("key", apiKey);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const t = await res.text();
        throw new Error(`YouTube videos failed: ${res.status} ${t}`);
      }
      const json = (await res.json()) as {
        items?: Array<{ id?: string; contentDetails?: { duration?: string } }>;
      };
      const map = new Map<string, string | undefined>();
      for (const it of json.items ?? []) {
        if (it.id) map.set(it.id, it.contentDetails?.duration);
      }
      for (const item of items) {
        const iso = map.get(item.youtubeVideoId);
        if (iso) item.durationSeconds = parseIsoDuration(iso);
      }
    }
  }

  /**
   * 寫入 videos、video_skill_tags、quizzes、quiz_questions（各 3 題 placeholder）。
   */
  async importAndSeedQuizzes(input: ImportPlaylistInput): Promise<{ imported: number }> {
    const items = await this.fetchPlaylistItems(
      input.playlistId,
      input.youtubeApiKey,
      input.includeRule,
    );
    await this.enrichDurations(items, input.youtubeApiKey);

    let sort = 0;
    for (const item of items) {
      sort += 1;
      const videoRow: VideoInsert = {
        unit_id: input.unitId,
        youtube_video_id: item.youtubeVideoId,
        playlist_id: input.playlistId,
        video_order: item.playlistPosition,
        title: item.title,
        description: item.description,
        duration_seconds: item.durationSeconds,
        thumbnail_url: item.thumbnailUrl,
        subtitle_text: null,
        sort_order: sort,
        is_active: true,
      };
      const videoId = await this.videoRepo.insertReturningId(videoRow);

      if (input.defaultSkillCode && input.defaultSkillName) {
        const tag: VideoSkillTagInsert = {
          video_id: videoId,
          skill_code: input.defaultSkillCode,
          skill_name: input.defaultSkillName,
        };
        await this.videoSkillRepo.insertMany([tag]);
      }

      const quizInsert: QuizInsert = {
        video_id: videoId,
        title: `${item.title} — AI學習診斷`,
        description: "觀看 90% 後解鎖AI學習診斷",
        pass_score: 2,
        question_count: 3,
        is_active: true,
      };
      const { id: quizId } = await this.quizRepo.insert(quizInsert);

      const skill = input.defaultSkillCode ?? "EL01";
      const questions: QuizQuestionInsert[] = [1, 2, 3].map((n, idx) => ({
        quiz_id: quizId,
        question_text: `（第 ${n} 題）請依據本影片內容選出最適當的答案。`,
        question_type: "mcq",
        choice_a: "選項 A",
        choice_b: "選項 B",
        choice_c: "選項 C",
        choice_d: "選項 D",
        correct_answer: "A",
        explanation: "請依教學內容修正本題與選項。",
        sort_order: idx,
        difficulty: "基礎",
        skill_code: skill,
      }));
      await this.quizQuestionRepo.insertMany(questions);
    }

    return { imported: items.length };
  }
}

function parseIsoDuration(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] ?? "0", 10);
  const min = parseInt(m[2] ?? "0", 10);
  const s = parseInt(m[3] ?? "0", 10);
  return h * 3600 + min * 60 + s;
}
