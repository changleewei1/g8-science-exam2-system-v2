import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export const HOME_ANNOUNCEMENT_ID = "home" as const;

export const DEFAULT_HOME_ANNOUNCEMENT = {
  title: "系統公告",
  items: [
    "國中理化 AI 智慧學習測試系統已開放第二次、第三次段考預習範圍。",
    "學生請由「學生登入」進入，依段考範圍觀看影片並完成 AI 理解測驗。",
    "老師請由「老師登入」查看班級學習進度與診斷數據。",
    "如有帳號或技術問題，請洽名貫補習班櫃台。",
  ],
} as const;

export type HomeAnnouncementPayload = {
  title: string;
  items: string[];
};

function normalizeAnnouncement(row: { title: string | null; items: string[] | null } | null): HomeAnnouncementPayload {
  if (!row?.items?.length) {
    return { title: DEFAULT_HOME_ANNOUNCEMENT.title, items: [...DEFAULT_HOME_ANNOUNCEMENT.items] };
  }
  const items = row.items.map((s) => s.trim()).filter(Boolean);
  if (!items.length) {
    return { title: DEFAULT_HOME_ANNOUNCEMENT.title, items: [...DEFAULT_HOME_ANNOUNCEMENT.items] };
  }
  return {
    title: (row.title && row.title.trim()) || DEFAULT_HOME_ANNOUNCEMENT.title,
    items,
  };
}

/** 首頁與公開讀取用；若資料庫未設定或查詢失敗則回傳預設文案 */
export async function getHomeAnnouncementForPublic(): Promise<HomeAnnouncementPayload> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("system_announcements")
      .select("title, items")
      .eq("id", HOME_ANNOUNCEMENT_ID)
      .maybeSingle();
    if (error) return normalizeAnnouncement(null);
    return normalizeAnnouncement(data);
  } catch {
    return normalizeAnnouncement(null);
  }
}

/** 後台讀取（與公開相同邏輯，失敗時亦回預設以利編輯器顯示） */
export async function getHomeAnnouncementForAdmin(): Promise<HomeAnnouncementPayload> {
  return getHomeAnnouncementForPublic();
}

export async function upsertHomeAnnouncement(payload: HomeAnnouncementPayload): Promise<void> {
  const sb = getSupabaseAdmin();
  const title = payload.title.trim() || DEFAULT_HOME_ANNOUNCEMENT.title;
  const items = payload.items.map((s) => s.trim()).filter(Boolean);
  if (!items.length) {
    throw new Error("至少需要一則公告條目");
  }
  const { error } = await sb.from("system_announcements").upsert(
    {
      id: HOME_ANNOUNCEMENT_ID,
      title,
      items,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message || "儲存失敗");
}
