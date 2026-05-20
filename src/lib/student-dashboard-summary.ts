import { getStudentLearningService } from "@/infrastructure/composition";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getStudentWeakSkillDetails } from "@/lib/report/analysis";
import { getStudentSkillPracticeRows, type StudentSkillPracticeRow } from "@/lib/skill-practice-summary";

export type StudentDashboardSummaryResponse = {
  examScope: {
    id: string;
    title: string;
    subject: string;
    grade: number;
    term: number;
    examNo: number;
  };
  /** 此段考是否已建立影片／技能／測驗等學習架構（全無時前端顯示防呆文案） */
  hasLearningData: boolean;
  overallCompletionRate: number;
  videoCompletionRate: number;
  quizPassRate: number;
  hasQuizzesInScope: boolean;
  averageMasteryScore: number;
  completedVideos: number;
  totalVideos: number;
  masteredSkills: number;
  totalSkills: number;
  todayWatchedVideos: number;
  todayAnsweredQuestions: number;
  weakSkills: Array<{
    skillCode: string;
    skillName: string;
    wrongRatePercent: number;
    recentWrongFocus: string;
    recommendedVideo: { id: string; title: string } | null;
  }>;
  recommendedVideos: Array<{ id: string; title: string; unitId: string }>;
  recommendedSkills: Array<{ code: string; name: string }>;
  todayTasksCompleted: boolean;
};

function ymdTaipei(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(d);
}

function parseSort(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

async function fetchScopeVideoIdsOrdered(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  examScopeId: string,
): Promise<{ orderedIds: string[]; idToTitle: Map<string, string>; idToUnitId: Map<string, string> }> {
  const { data: units } = await supabase
    .from("scope_units")
    .select("id, sort_order")
    .eq("exam_scope_id", examScopeId);
  const sortedUnits = [...(units ?? [])].sort(
    (a, b) =>
      parseSort((a as { sort_order: unknown }).sort_order, 9999) -
      parseSort((b as { sort_order: unknown }).sort_order, 9999),
  );
  const orderedIds: string[] = [];
  const idToTitle = new Map<string, string>();
  const idToUnitId = new Map<string, string>();
  for (const u of sortedUnits) {
    const uid = (u as { id: string }).id;
    const { data: vids } = await supabase.from("videos").select("id, title, sort_order").eq("unit_id", uid);
    const sorted = [...(vids ?? [])].sort(
      (a, b) =>
        parseSort((a as { sort_order: unknown }).sort_order, 9999) -
        parseSort((b as { sort_order: unknown }).sort_order, 9999),
    );
    for (const v of sorted) {
      const row = v as { id: string; title: string };
      orderedIds.push(row.id);
      idToTitle.set(row.id, row.title);
      idToUnitId.set(row.id, uid);
    }
  }
  return { orderedIds, idToTitle, idToUnitId };
}

function pickSuggestedSkills(rows: StudentSkillPracticeRow[], max: number) {
  const rank = (r: StudentSkillPracticeRow) => {
    if (r.status === "建議加強") return 0;
    if (r.status === "練習中") return 1;
    if (r.status === "尚未開始") return 2;
    return 3;
  };
  const scored = rows
    .filter((r) => r.status !== "已精熟")
    .map((r) => ({
      row: r,
      rnk: rank(r),
      mastery: r.mastery_score,
    }))
    .sort((a, b) => a.rnk - b.rnk || a.mastery - b.mastery);
  return scored.slice(0, max).map((x) => x.row);
}

export async function buildStudentDashboardSummary(
  studentId: string,
  scopeId: string,
): Promise<StudentDashboardSummaryResponse | null> {
  const supabase = getSupabaseAdmin();
  const { data: scopeRow, error: se } = await supabase
    .from("exam_scopes")
    .select("id, title, subject, grade, term, exam_no, is_active")
    .eq("id", scopeId)
    .maybeSingle();
  if (se || !scopeRow) return null;
  const scope = scopeRow as {
    id: string;
    title: string;
    subject: string;
    grade: number;
    term: number;
    exam_no: number;
    is_active: boolean;
  };
  if (!scope.is_active) return null;

  const learning = getStudentLearningService();
  const [videoCompletionRate, quizPassRate, practicePack, orderedPack] = await Promise.all([
    learning.getVideoCompletionRate(studentId, scopeId),
    learning.getQuizPassRate(studentId, scopeId),
    getStudentSkillPracticeRows(studentId, scopeId),
    fetchScopeVideoIdsOrdered(supabase, scopeId),
  ]);

  const { orderedIds, idToTitle, idToUnitId } = orderedPack;
  const totalVideos = orderedIds.length;

  let completedVideos = 0;
  const completedSet = new Set<string>();
  if (orderedIds.length > 0) {
    const { data: vp } = await supabase
      .from("student_video_progress")
      .select("video_id, is_completed")
      .eq("student_id", studentId)
      .in("video_id", orderedIds);
    const done = new Set<string>();
    for (const row of vp ?? []) {
      const r = row as { video_id: string; is_completed: boolean };
      if (r.is_completed) done.add(r.video_id);
    }
    for (const id of orderedIds) {
      if (done.has(id)) {
        completedSet.add(id);
        completedVideos += 1;
      }
    }
  }

  let scopeQuizIds: string[] = [];
  if (orderedIds.length > 0) {
    const { data: quizRowsAll } = await supabase.from("quizzes").select("id").in("video_id", orderedIds);
    scopeQuizIds = (quizRowsAll ?? []).map((r: { id: string }) => r.id);
  }
  const hasQuizzesInScope = scopeQuizIds.length > 0;

  const flatSkills = practicePack?.units.flatMap((u) => u.skills) ?? [];
  const totalSkills = flatSkills.length;
  const masteredSkills = flatSkills.filter((s) => s.status === "已精熟").length;
  const practiced = flatSkills.filter((s) => s.answered_count > 0);
  const averageMasteryScore =
    practiced.length > 0
      ? Math.round(practiced.reduce((a, s) => a + s.mastery_score, 0) / practiced.length)
      : 0;

  const skillSlotRate = totalSkills > 0 ? Math.round((masteredSkills / totalSkills) * 1000) / 10 : 0;
  const overallCompletionRate = Math.round((videoCompletionRate + skillSlotRate) * 10) / 10;

  const today = ymdTaipei();
  const start = `${today}T00:00:00+08:00`;
  const end = `${today}T23:59:59+08:00`;

  let todayWatchedVideos = 0;
  if (orderedIds.length > 0) {
    const { data: vpToday } = await supabase
      .from("student_video_progress")
      .select("video_id")
      .eq("student_id", studentId)
      .in("video_id", orderedIds)
      .gte("last_viewed_at", start)
      .lte("last_viewed_at", end);
    const set = new Set<string>();
    for (const row of vpToday ?? []) {
      const r = row as { video_id: string };
      if (r.video_id) set.add(r.video_id);
    }
    todayWatchedVideos = set.size;
  }

  let todayAnsweredQuestions = 0;
  try {
    if (scopeQuizIds.length > 0) {
      const { data: attempts } = await supabase
        .from("student_quiz_attempts")
        .select("id")
        .eq("student_id", studentId)
        .in("quiz_id", scopeQuizIds)
        .not("submitted_at", "is", null);
      const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
      if (attemptIds.length > 0) {
        const { data: ans } = await supabase
          .from("student_quiz_answers")
          .select("id")
          .in("attempt_id", attemptIds)
          .gte("created_at", start)
          .lte("created_at", end);
        todayAnsweredQuestions = (ans ?? []).length;
      }
    }
  } catch {
    todayAnsweredQuestions = 0;
  }

  const videoIdSet = new Set(orderedIds);
  const weakDetails = await getStudentWeakSkillDetails(supabase, scopeId, studentId, 3);
  const weakSkills: StudentDashboardSummaryResponse["weakSkills"] = [];
  for (const w of weakDetails) {
    let recommendedVideo: { id: string; title: string } | null = null;
    if (orderedIds.length > 0) {
      const { data: vst } = await supabase
        .from("video_skill_tags")
        .select("video_id")
        .eq("skill_code", w.skillCode)
        .in("video_id", orderedIds)
        .limit(1);
      const vid = (vst ?? [])[0] as { video_id: string } | undefined;
      if (vid?.video_id && videoIdSet.has(vid.video_id)) {
        const title = idToTitle.get(vid.video_id) ?? "推薦影片";
        recommendedVideo = { id: vid.video_id, title };
      }
    }
    weakSkills.push({
      skillCode: w.skillCode,
      skillName: w.skillName,
      wrongRatePercent: Math.round(w.wrongRate * 1000) / 10,
      recentWrongFocus: `測驗中「${w.skillName}」相關題目答錯較多（${w.wrongCount}/${w.totalAttempts} 題）`,
      recommendedVideo,
    });
  }

  const incompleteOrdered = orderedIds.filter((id) => !completedSet.has(id));
  const recommendedVideos = incompleteOrdered.slice(0, 3).map((id) => ({
    id,
    title: idToTitle.get(id) ?? "影片",
    unitId: idToUnitId.get(id) ?? "",
  }));

  const skillPicks = pickSuggestedSkills(flatSkills, 3);
  const recommendedSkills = skillPicks.map((r) => ({
    code: r.skill_code,
    name: r.skill_name,
  }));

  const quizSatisfied = !hasQuizzesInScope || quizPassRate >= 100;
  const videoSatisfied = totalVideos === 0 ? false : completedVideos >= totalVideos;
  const skillSatisfied = totalSkills === 0 ? true : masteredSkills >= totalSkills;
  const todayTasksCompleted = videoSatisfied && skillSatisfied && quizSatisfied;

  const hasLearningData = totalVideos > 0 || totalSkills > 0 || hasQuizzesInScope;

  return {
    examScope: {
      id: scope.id,
      title: scope.title,
      subject: scope.subject,
      grade: scope.grade,
      term: scope.term,
      examNo: scope.exam_no,
    },
    hasLearningData,
    overallCompletionRate,
    videoCompletionRate,
    quizPassRate: hasQuizzesInScope ? quizPassRate : 0,
    hasQuizzesInScope,
    averageMasteryScore,
    completedVideos,
    totalVideos,
    masteredSkills,
    totalSkills,
    todayWatchedVideos,
    todayAnsweredQuestions,
    weakSkills,
    recommendedVideos,
    recommendedSkills,
    todayTasksCompleted,
  };
}
