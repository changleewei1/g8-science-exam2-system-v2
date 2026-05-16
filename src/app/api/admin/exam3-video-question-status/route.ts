import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "@/lib/exam3-scope";
import { looksLikePlaceholderQuizQuestion } from "@/lib/exam3-video-quiz-guards";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Readiness = "ready" | "pending_review" | "insufficient";

type Row = {
  videoId: string;
  title: string;
  unitTitle: string;
  hasSubtitle: boolean;
  skillTagCount: number;
  bankItemCount: number;
  draftCandidateCount: number;
  quizQuestionCount: number;
  quizNonPlaceholderCount: number;
  readyForStudents: boolean;
  readiness: Readiness;
  readinessLabel: string;
};

function readinessOf(input: {
  bankN: number;
  draftN: number;
  nonPh: number;
  hasSubtitle: boolean;
  hasTags: boolean;
}): { readiness: Readiness; label: string; ready: boolean } {
  const { bankN, draftN, nonPh, hasSubtitle, hasTags } = input;
  const baseOk = hasSubtitle && hasTags;

  if (baseOk && nonPh >= 3) {
    return { readiness: "ready", label: "可給學生作答（測驗 ≥3 真題）", ready: true };
  }
  if (baseOk && bankN >= 3) {
    return { readiness: "pending_review", label: "題庫已足，待同步測驗", ready: false };
  }
  if (draftN >= 3) {
    return { readiness: "pending_review", label: "有 draft，待核准", ready: false };
  }
  if (bankN > 0 && bankN < 3) {
    return { readiness: "insufficient", label: `題庫不足（${bankN}/3）`, ready: false };
  }
  return { readiness: "insufficient", label: "題目不足", ready: false };
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const supabase = getSupabaseAdmin();
  const { data: units, error: uErr } = await supabase
    .from("scope_units")
    .select("id, unit_title")
    .eq("exam_scope_id", G8_SPRING_TERM_EXAM3_SCOPE_ID);
  if (uErr) throw uErr;
  const unitMap = new Map((units ?? []).map((u) => [u.id as string, String(u.unit_title ?? "")]));
  const unitIds = [...unitMap.keys()];
  if (unitIds.length === 0) {
    return NextResponse.json({ videos: [] as Row[] });
  }

  const { data: videos, error: vErr } = await supabase
    .from("videos")
    .select("id, unit_id, title, subtitle_text")
    .in("unit_id", unitIds)
    .order("sort_order", { ascending: true });
  if (vErr) throw vErr;

  const videoList = videos ?? [];
  const videoIds = videoList.map((v) => v.id as string);

  const [{ data: tagAgg }, { data: bankAgg }, { data: draftAgg }, { data: quizzes }] = await Promise.all([
    supabase.from("video_skill_tags").select("video_id").in("video_id", videoIds),
    supabase.from("question_bank_items").select("id, video_id, question_text, choice_a, choice_b, choice_c, choice_d").in("video_id", videoIds),
    supabase
      .from("generated_question_candidates")
      .select("id, video_id, status")
      .in("video_id", videoIds)
      .eq("status", "draft"),
    supabase.from("quizzes").select("id, video_id").in("video_id", videoIds),
  ]);

  const tagCountByVideo = new Map<string, number>();
  for (const t of tagAgg ?? []) {
    const vid = t.video_id as string;
    tagCountByVideo.set(vid, (tagCountByVideo.get(vid) ?? 0) + 1);
  }

  const bankCountByVideo = new Map<string, number>();
  for (const b of bankAgg ?? []) {
    if (
      looksLikePlaceholderQuizQuestion({
        questionText: String(b.question_text ?? ""),
        choiceA: String(b.choice_a ?? ""),
        choiceB: String(b.choice_b ?? ""),
        choiceC: String(b.choice_c ?? ""),
        choiceD: String(b.choice_d ?? ""),
      })
    ) {
      continue;
    }
    const vid = b.video_id as string;
    bankCountByVideo.set(vid, (bankCountByVideo.get(vid) ?? 0) + 1);
  }

  const draftCountByVideo = new Map<string, number>();
  for (const d of draftAgg ?? []) {
    const vid = d.video_id as string;
    draftCountByVideo.set(vid, (draftCountByVideo.get(vid) ?? 0) + 1);
  }

  const quizIdByVideo = new Map<string, string>();
  for (const q of quizzes ?? []) {
    quizIdByVideo.set(q.video_id as string, q.id as string);
  }

  const quizIds = [...quizIdByVideo.values()];
  const qqByQuiz = new Map<string, { text: string; a: string; b: string; c: string; d: string }[]>();
  if (quizIds.length > 0) {
    const { data: qqRows, error: qqErr } = await supabase
      .from("quiz_questions")
      .select("quiz_id, question_text, choice_a, choice_b, choice_c, choice_d")
      .in("quiz_id", quizIds);
    if (qqErr) throw qqErr;
    for (const row of qqRows ?? []) {
      const qid = row.quiz_id as string;
      const list = qqByQuiz.get(qid) ?? [];
      list.push({
        text: String(row.question_text ?? ""),
        a: String(row.choice_a ?? ""),
        b: String(row.choice_b ?? ""),
        c: String(row.choice_c ?? ""),
        d: String(row.choice_d ?? ""),
      });
      qqByQuiz.set(qid, list);
    }
  }

  const rows: Row[] = videoList.map((v) => {
    const videoId = v.id as string;
    const quizId = quizIdByVideo.get(videoId);
    const qqList = quizId ? (qqByQuiz.get(quizId) ?? []) : [];
    const nonPh = qqList.filter(
      (q) =>
        !looksLikePlaceholderQuizQuestion({
          questionText: q.text,
          choiceA: q.a,
          choiceB: q.b,
          choiceC: q.c,
          choiceD: q.d,
        }),
    );
    const sub = ((v.subtitle_text as string | null) ?? "").trim();
    const bankN = bankCountByVideo.get(videoId) ?? 0;
    const draftN = draftCountByVideo.get(videoId) ?? 0;
    const hasSubtitle = sub.length >= 40;
    const hasTags = (tagCountByVideo.get(videoId) ?? 0) > 0;
    const r = readinessOf({
      bankN,
      draftN,
      nonPh: nonPh.length,
      hasSubtitle,
      hasTags,
    });

    return {
      videoId,
      title: String(v.title ?? ""),
      unitTitle: unitMap.get(v.unit_id as string) ?? "",
      hasSubtitle,
      skillTagCount: tagCountByVideo.get(videoId) ?? 0,
      bankItemCount: bankN,
      draftCandidateCount: draftN,
      quizQuestionCount: qqList.length,
      quizNonPlaceholderCount: nonPh.length,
      readyForStudents: r.ready,
      readiness: r.readiness,
      readinessLabel: r.label,
    };
  });

  return NextResponse.json({ videos: rows });
}
