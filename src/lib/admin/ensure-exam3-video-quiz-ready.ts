import type { SupabaseClient } from "@supabase/supabase-js";
import { countRealExam3BankItems } from "@/lib/admin/approve-exam3-candidate";
import { syncVideoComprehensionQuizFromBank } from "@/lib/admin/sync-video-quiz-from-bank";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "@/lib/exam3-scope";

/**
 * 第三次段考：確保有 quizzes 壳；題庫 ≥3 真題時同步 quiz_questions（不影響第二次段考）。
 */
export async function ensureExam3VideoQuizReady(
  supabase: SupabaseClient,
  videoId: string,
): Promise<{ isExam3: boolean; bankCount: number; synced: boolean }> {
  const { data: video, error: vErr } = await supabase
    .from("videos")
    .select("id, unit_id, title")
    .eq("id", videoId)
    .maybeSingle();
  if (vErr) throw vErr;
  if (!video?.unit_id) return { isExam3: false, bankCount: 0, synced: false };

  const { data: unit, error: uErr } = await supabase
    .from("scope_units")
    .select("exam_scope_id")
    .eq("id", video.unit_id as string)
    .maybeSingle();
  if (uErr) throw uErr;
  if ((unit?.exam_scope_id as string | null) !== G8_SPRING_TERM_EXAM3_SCOPE_ID) {
    return { isExam3: false, bankCount: 0, synced: false };
  }

  const { data: existingQuiz, error: qFindErr } = await supabase
    .from("quizzes")
    .select("id")
    .eq("video_id", videoId)
    .maybeSingle();
  if (qFindErr) throw qFindErr;

  if (!existingQuiz?.id) {
    const title = (video.title as string) ?? "影片";
    const { error: insQErr } = await supabase.from("quizzes").insert({
      video_id: videoId,
      title: `${title} — 影片理解測驗`,
      description: "觀看 90% 後可作答；答對 2 題以上通過",
      pass_score: 2,
      question_count: 3,
      is_active: true,
    });
    if (insQErr) throw insQErr;
  }

  const bankCount = await countRealExam3BankItems(supabase, videoId);
  if (bankCount < 3) {
    return { isExam3: true, bankCount, synced: false };
  }

  const sync = await syncVideoComprehensionQuizFromBank(supabase, videoId);
  return { isExam3: true, bankCount, synced: sync.ok };
}
