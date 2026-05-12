/** 自 YouTube URL 抽出 11 字元影片 id（失敗回傳 null） */
export function extractYoutubeVideoId(rawInput: string): string | null {
  const raw = rawInput.trim();
  if (!raw) return null;
  const tryParse = (s: string) => {
    try {
      return new URL(s);
    } catch {
      return null;
    }
  };
  let u = tryParse(raw);
  if (!u && /^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;
  if (!u) {
    u = tryParse(`https://${raw}`);
  }
  if (!u) return null;

  const host = u.hostname.replace(/^www\./i, "").toLowerCase();

  if (host === "youtu.be") {
    const id = u.pathname.replace(/^\//, "").slice(0, 11);
    return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
  }

  if (host.includes("youtube.com")) {
    const v = u.searchParams.get("v")?.trim();
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    const mShorts = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (mShorts?.[1]) return mShorts[1];
    const mEmbed = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
    if (mEmbed?.[1]) return mEmbed[1];
  }

  return null;
}

/** 無需 API key，優先以此取得標題 */
export async function fetchYoutubeTitleOEmbed(videoId: string): Promise<string | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  try {
    const u = new URL("https://www.youtube.com/oembed");
    u.searchParams.set("url", watchUrl);
    u.searchParams.set("format", "json");
    const res = await fetch(u.toString(), { next: { revalidate: 0 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { title?: string };
    const t = (j.title ?? "").trim();
    return t || null;
  } catch {
    return null;
  }
}
