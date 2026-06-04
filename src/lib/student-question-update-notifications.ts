import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type StudentQuestionUpdateListItem = {
  notificationId: string;
  questionId: string;
  videoId: string | null;
  videoTitle: string;
  quizId: string | null;
  oldVersion: number;
  newVersion: number;
  currentVersion: number;
  changeReason: string | null;
  bankUpdatedAt: string | null;
  isRead: boolean;
  createdAt: string;
};

/** 未讀「題目已更新」通知筆數 */
export async function countUnreadQuestionUpdateNotifications(studentId: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("question_update_notifications")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("is_read", false);
  if (error) return 0;
  return count ?? 0;
}

async function quizIdsByVideoIds(videoIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const ids = [...new Set(videoIds.filter(Boolean))];
  if (ids.length === 0) return map;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("quizzes").select("id, video_id").in("video_id", ids);
  if (error) return map;
  for (const row of data ?? []) {
    const r = row as { id: string; video_id: string };
    if (r.video_id && !map.has(r.video_id)) map.set(r.video_id, r.id);
  }
  return map;
}

/** 學生題目更新列表（含影片名、測驗 id） */
export async function fetchStudentQuestionUpdateNotifications(
  studentId: string,
  opts?: { onlyUnread?: boolean; limit?: number },
): Promise<StudentQuestionUpdateListItem[]> {
  const supabase = getSupabaseAdmin();
  const limit = Math.min(Math.max(opts?.limit ?? 40, 1), 100);
  let q = supabase
    .from("question_update_notifications")
    .select(
      `
      id,
      question_id,
      old_version,
      new_version,
      is_read,
      created_at,
      question_bank_items (
        version,
        change_reason,
        updated_at,
        video_id,
        videos ( id, title )
      )
    `,
    )
    .eq("student_id", studentId)
    .order("is_read", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (opts?.onlyUnread) {
    q = q.eq("is_read", false);
  }

  const { data, error } = await q;
  if (error || !data) return [];

  const videoIds: string[] = [];
  const rows = (data as unknown[]).map((raw) => {
    const r = raw as {
      id: string;
      question_id: string;
      old_version: number;
      new_version: number;
      is_read: boolean;
      created_at: string;
      question_bank_items: {
        version: number;
        change_reason: string | null;
        updated_at: string | null;
        video_id: string | null;
        videos: { id: string; title: string } | null;
      } | null;
    };
    const bank = r.question_bank_items;
    const vid = bank?.video_id ?? null;
    if (vid) videoIds.push(vid);
    const vtitle = bank?.videos?.title?.trim() || "（影片）";
    return {
      notificationId: r.id,
      questionId: r.question_id,
      videoId: vid,
      videoTitle: vtitle,
      quizId: null as string | null,
      oldVersion: r.old_version,
      newVersion: r.new_version,
      currentVersion: bank?.version ?? r.new_version,
      changeReason: bank?.change_reason ?? null,
      bankUpdatedAt: bank?.updated_at ?? null,
      isRead: r.is_read,
      createdAt: r.created_at,
    };
  });

  const quizByVideo = await quizIdsByVideoIds(videoIds);
  for (const row of rows) {
    if (row.videoId) row.quizId = quizByVideo.get(row.videoId) ?? null;
  }
  return rows;
}

export async function markQuestionUpdateNotificationsReadByQuestionIds(
  studentId: string,
  questionIds: string[],
): Promise<void> {
  const ids = [...new Set(questionIds.filter(Boolean))];
  if (ids.length === 0) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("question_update_notifications")
    .update({ is_read: true })
    .eq("student_id", studentId)
    .in("question_id", ids)
    .eq("is_read", false);
}

export async function markQuestionUpdateNotificationsReadByVideoId(
  studentId: string,
  videoId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: bank } = await supabase.from("question_bank_items").select("id").eq("video_id", videoId);
  const qids = (bank ?? []).map((b) => (b as { id: string }).id);
  if (qids.length === 0) return;
  await markQuestionUpdateNotificationsReadByQuestionIds(studentId, qids);
}

export async function markQuestionUpdateNotificationsReadByNotificationIds(
  studentId: string,
  notificationIds: string[],
): Promise<void> {
  const ids = [...new Set(notificationIds.filter(Boolean))];
  if (ids.length === 0) return;
  const supabase = getSupabaseAdmin();
  await supabase
    .from("question_update_notifications")
    .update({ is_read: true })
    .eq("student_id", studentId)
    .in("id", ids)
    .eq("is_read", false);
}

/** 學生提交該影片測驗後：將相關題庫題的通知標為已讀 */
export async function markQuestionUpdateNotificationsReadAfterQuizSubmit(
  studentId: string,
  quizId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: qq } = await supabase
    .from("quiz_questions")
    .select("question_bank_item_id")
    .eq("quiz_id", quizId);
  const bankIds = [
    ...new Set(
      (qq ?? [])
        .map((r) => (r as { question_bank_item_id: string | null }).question_bank_item_id)
        .filter((x): x is string => Boolean(x)),
    ),
  ];
  if (bankIds.length === 0) return;
  await markQuestionUpdateNotificationsReadByQuestionIds(studentId, bankIds);
}

/** 家長信：近 7 日未讀題目更新摘要 */
export async function fetchParentQuestionUpdateSummary(studentId: string): Promise<{
  unreadCount: number;
  videoTitles: string[];
}> {
  const supabase = getSupabaseAdmin();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceIso = since.toISOString();

  const { data, error, count } = await supabase
    .from("question_update_notifications")
    .select(
      `
      id,
      question_bank_items (
        videos ( title )
      )
    `,
      { count: "exact" },
    )
    .eq("student_id", studentId)
    .eq("is_read", false)
    .gte("created_at", sinceIso)
    .limit(120);

  if (error || !data) return { unreadCount: 0, videoTitles: [] };

  const titles = new Set<string>();
  for (const row of data as unknown[]) {
    const r = row as {
      question_bank_items: { videos: { title: string } | null } | null;
    };
    const t = r.question_bank_items?.videos?.title?.trim();
    if (t) titles.add(t);
  }

  return {
    unreadCount: count ?? data.length,
    videoTitles: [...titles].slice(0, 8),
  };
}

/** 首頁「立即複習」：導向第一則未讀對應的影片測驗 */
export async function resolveFirstUnreadQuestionQuizHref(studentId: string): Promise<string | null> {
  const rows = await fetchStudentQuestionUpdateNotifications(studentId, { onlyUnread: true, limit: 20 });
  const hit = rows.find((r) => r.quizId);
  return hit?.quizId ? `/student/quiz/${hit.quizId}` : null;
}
