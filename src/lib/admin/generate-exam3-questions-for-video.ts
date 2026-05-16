import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchSubtitleByYtDlp, generateExam3ThreeMcqsWithOpenAI } from "@/lib/admin/video-ai";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "@/lib/exam3-scope";

export type Exam3GenResult =
  | { ok: true; inserted: number; mode: "exam3_three" }
  | { ok: false; reason: string; message: string; inserted?: number };

/**
 * 為單一第三次段考影片寫入 3 筆 generated_question_candidates（draft）。
 * 須已建立 video_skill_tags；字幕可選手動覆寫。
 */
export async function generateExam3CandidatesForVideo(
  supabase: SupabaseClient,
  input: {
    videoUuid: string;
    openAiKey: string;
    model?: string;
    manualSubtitle?: string;
  },
): Promise<Exam3GenResult> {
  const model = input.model ?? "gpt-4o-mini";
  const { data: video, error: vErr } = await supabase
    .from("videos")
    .select("id, unit_id, youtube_video_id, title, subtitle_text")
    .eq("id", input.videoUuid)
    .maybeSingle();
  if (vErr) throw vErr;
  if (!video) return { ok: false, reason: "NOT_FOUND", message: "找不到影片" };

  const { data: unit, error: uErr } = await supabase
    .from("scope_units")
    .select("unit_title, exam_scope_id")
    .eq("id", video.unit_id as string)
    .maybeSingle();
  if (uErr) throw uErr;
  if ((unit?.exam_scope_id as string | null) !== G8_SPRING_TERM_EXAM3_SCOPE_ID) {
    return { ok: false, reason: "NOT_EXAM3", message: "此影片不屬於第三次段考範圍，已略過。" };
  }
  const unitForBank = unit?.unit_title ?? "未知單元";
  const examScopeId = G8_SPRING_TERM_EXAM3_SCOPE_ID;

  const { data: tagRows, error: tgErr } = await supabase
    .from("video_skill_tags")
    .select("skill_code, skill_name")
    .eq("video_id", input.videoUuid);
  if (tgErr) throw tgErr;
  const tags = tagRows ?? [];
  if (tags.length === 0) {
    return { ok: false, reason: "NO_SKILLS_TAGGED", message: "尚未建立 video_skill_tags" };
  }

  let subtitle =
    input.manualSubtitle?.trim() || ((video.subtitle_text as string | null) ?? "").trim();
  if (!subtitle) {
    subtitle = await fetchSubtitleByYtDlp(video.youtube_video_id as string);
  }
  if (!subtitle) {
    return { ok: false, reason: "NO_SUBTITLE", message: "無字幕且無法以 yt-dlp 取得" };
  }

  await supabase
    .from("videos")
    .update({ subtitle_text: subtitle.slice(0, 500000) })
    .eq("id", input.videoUuid);

  const codes = tags.map((t) => String(t.skill_code ?? "").trim()).filter(Boolean);
  const { data: metaRows, error: metaErr } = await supabase
    .from("skill_tags")
    .select("code, name, skill_detail, sample_question, common_mistakes")
    .in("code", codes);
  if (metaErr) throw metaErr;
  const metaByCode = new Map(
    (metaRows ?? []).map((m) => [
      String(m.code ?? "").trim(),
      {
        code: String(m.code ?? "").trim(),
        name: String(m.name ?? "").trim(),
        skill_detail: (m.skill_detail as string | null) ?? null,
        sample_question: (m.sample_question as string | null) ?? null,
        common_mistakes: (m.common_mistakes as string | null) ?? null,
      },
    ]),
  );
  const skills = tags
    .map((t) => {
      const code = String(t.skill_code ?? "").trim();
      const m = metaByCode.get(code);
      return {
        code,
        name: m?.name || String(t.skill_name ?? "").trim() || code,
        skill_detail: m?.skill_detail ?? null,
        sample_question: m?.sample_question ?? null,
        common_mistakes: m?.common_mistakes ?? null,
      };
    })
    .filter((s) => s.code);

  let items;
  try {
    items = await generateExam3ThreeMcqsWithOpenAI({
      apiKey: input.openAiKey,
      model,
      unitTitle: unitForBank,
      title: video.title as string,
      subtitleText: subtitle,
      skills,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "OpenAI 錯誤";
    return { ok: false, reason: "OPENAI_FAILED", message: msg.slice(0, 400) };
  }

  if (items.length < 3) {
    return {
      ok: false,
      reason: "INCOMPLETE_GENERATION",
      message: `模型僅產出 ${items.length} 題有效題目`,
      inserted: 0,
    };
  }

  let inserted = 0;
  for (const it of items) {
    const excerpt = subtitle.slice(0, 500);
    const { error: insErr } = await supabase.from("generated_question_candidates").insert({
      video_id: input.videoUuid,
      unit: it.unit || unitForBank,
      skill_code: it.skill_code,
      difficulty: it.difficulty,
      question_text: it.question_text,
      choice_a: it.choice_a,
      choice_b: it.choice_b,
      choice_c: it.choice_c,
      choice_d: it.choice_d,
      correct_answer: it.correct_answer,
      explanation: it.explanation,
      source_excerpt: excerpt,
      status: "draft",
      exam_scope_id: examScopeId,
    });
    if (insErr) throw insErr;
    inserted += 1;
  }

  return { ok: true, inserted, mode: "exam3_three" };
}
