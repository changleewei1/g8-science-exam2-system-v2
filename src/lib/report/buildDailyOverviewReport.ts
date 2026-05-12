import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import {
  buildTeacherSuggestions,
  getAtRiskStudents,
  type StudentCompletionRow,
  getWeakSkills,
} from "@/lib/report/analysis";
import { resolvePublicOriginWithoutRequest } from "@/lib/report/reportOrigin";

export type DailyOverviewReport = {
  title: string;
  content: string;
  html: string;
  metrics: {
    classCount: number;
    studentCount: number;
    scopeVideoTotal: number;
    scopeVideoCompletedTotal: number;
    classVideoCompletionRate: number;
    todayViewedVideoCount: number;
    todayAnsweredQuestionCount: number;
    incompleteStudentCount: number;
    completedStudentCount: number;
    atRiskStudentCount: number;
    recentTaskCount: number;
    topStudents: { name: string; className: string | null; completionRate: number }[];
  };
  warnings: string[];
};

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function ymdTaipei(d = new Date()): string {
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(d);
  // sv-SE gives YYYY-MM-DD
  return p;
}

export async function buildDailyOverviewReport(): Promise<DailyOverviewReport> {
  type StudentScopeCompletion = StudentCompletionRow & {
    videoCompletionRate: number;
    quizCompletionRate: number;
    completedVideos: number;
    completedQuizzes: number;
  };
  const supabase = getSupabaseAdmin();
  const warnings: string[] = [];

  const today = ymdTaipei();
  const title = "【國二理化】每日學習分析總覽";

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_name, is_active")
    .eq("is_active", true);
  const activeStudents = (students ?? []) as { id: string; name: string; class_name: string | null }[];
  if (activeStudents.length === 0) {
    warnings.push("沒有學生資料。");
  }
  const studentIds = activeStudents.map((s) => s.id);
  const classSet = new Set(activeStudents.map((s) => s.class_name ?? "未分班"));

  // 以目前 active exam_scope 的 scope_units + videos 作為「段考範圍」
  const { data: scope } = await supabase
    .from("exam_scopes")
    .select("id, title")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const examScopeId = (scope as { id: string } | null)?.id ?? null;
  if (!examScopeId) {
    throw new Error("examScopeId 不存在");
  }

  let scopeVideoIds: string[] = [];
  const { data: units } = await supabase
    .from("scope_units")
    .select("id")
    .eq("exam_scope_id", examScopeId);
  const unitIds = (units ?? []).map((u: { id: string }) => u.id);
  if (unitIds.length > 0) {
    const { data: vids } = await supabase.from("videos").select("id").in("unit_id", unitIds);
    scopeVideoIds = [...new Set((vids ?? []).map((v: { id: string }) => v.id))];
  }

  const scopeVideoTotal = scopeVideoIds.length;
  if (scopeVideoTotal === 0) {
    warnings.push("段考範圍沒有影片資料。");
  }

  // 影片完成：用 student_video_progress.is_completed（段考範圍內）
  const completedByStudent = new Map<string, number>();
  if (studentIds.length > 0 && scopeVideoIds.length > 0) {
    const { data: vp } = await supabase
      .from("student_video_progress")
      .select("student_id, video_id, is_completed, last_viewed_at")
      .in("student_id", studentIds)
      .in("video_id", scopeVideoIds);
    for (const row of vp ?? []) {
      const r = row as {
        student_id: string;
        video_id: string;
        is_completed: boolean;
        last_viewed_at: string | null;
      };
      if (r.is_completed) {
        completedByStudent.set(r.student_id, (completedByStudent.get(r.student_id) ?? 0) + 1);
      }
    }
  }

  let scopeVideoCompletedTotal = 0;
  for (const n of completedByStudent.values()) scopeVideoCompletedTotal += n;

  // 班級整體完成率：以「每位學生完成率的平均」計算（避免人數差異造成偏差）
  const completionRates = activeStudents.map((s) => {
    const done = completedByStudent.get(s.id) ?? 0;
    return toPercent(done, scopeVideoTotal);
  });
  const classVideoCompletionRate =
    completionRates.length === 0 ? 0 : Math.round((completionRates.reduce((a, b) => a + b, 0) / completionRates.length) * 10) / 10;

  // 今日觀看影片數：以 last_viewed_at 落在台北今日 00:00-23:59 的 distinct video count（全班合計）
  let todayViewedVideoCount = 0;
  if (studentIds.length > 0) {
    const start = `${today}T00:00:00+08:00`;
    const end = `${today}T23:59:59+08:00`;
    const { data: vpToday } = await supabase
      .from("student_video_progress")
      .select("video_id, last_viewed_at")
      .in("student_id", studentIds)
      .gte("last_viewed_at", start)
      .lte("last_viewed_at", end);
    const set = new Set<string>();
    for (const row of vpToday ?? []) {
      const r = row as { video_id: string; last_viewed_at: string | null };
      if (r.video_id) set.add(r.video_id);
    }
    todayViewedVideoCount = set.size;
  }

  // 今日作答題目數：以 student_quiz_answers.created_at 落在台北今日
  let todayAnsweredQuestionCount = 0;
  try {
    const start = `${today}T00:00:00+08:00`;
    const end = `${today}T23:59:59+08:00`;
    const { data: attempts } = await supabase
      .from("student_quiz_attempts")
      .select("id")
      .in("student_id", studentIds)
      .not("submitted_at", "is", null);
    const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
    if (attemptIds.length > 0) {
      const { data: ans } = await supabase
        .from("student_quiz_answers")
        .select("id, created_at")
        .in("attempt_id", attemptIds)
        .gte("created_at", start)
        .lte("created_at", end);
      todayAnsweredQuestionCount = (ans ?? []).length;
    }
  } catch {
    warnings.push("無法統計今日作答題目數（可能缺少 student_quiz_answers 或欄位）。");
  }

  // 段考範圍 quizzes（若無 quiz，整體完成率先採用影片完成率）
  let scopeQuizIds: string[] = [];
  if (scopeVideoIds.length > 0) {
    const { data: quizzes } = await supabase
      .from("quizzes")
      .select("id")
      .in("video_id", scopeVideoIds);
    scopeQuizIds = [...new Set((quizzes ?? []).map((q: { id: string }) => q.id))];
  }
  if (scopeQuizIds.length === 0) {
    warnings.push("段考範圍沒有 quiz 資料，完成率先以影片完成率計算。");
  }

  const attemptedQuizSet = new Set<string>();
  if (scopeQuizIds.length > 0 && studentIds.length > 0) {
    const { data: attempts } = await supabase
      .from("student_quiz_attempts")
      .select("student_id, quiz_id")
      .in("student_id", studentIds)
      .in("quiz_id", scopeQuizIds)
      .not("submitted_at", "is", null);
    for (const row of attempts ?? []) {
      const r = row as { student_id: string; quiz_id: string };
      attemptedQuizSet.add(`${r.student_id}:${r.quiz_id}`);
    }
  }

  const totalQuizzes = scopeQuizIds.length;
  const studentCompletions: StudentScopeCompletion[] = activeStudents.map((s) => {
    const completedVideos = completedByStudent.get(s.id) ?? 0;
    const videoCompletionRate = toPercent(completedVideos, scopeVideoTotal);

    let completedQuizzes = 0;
    for (const qid of scopeQuizIds) {
      if (attemptedQuizSet.has(`${s.id}:${qid}`)) completedQuizzes += 1;
    }
    const quizCompletionRate = toPercent(completedQuizzes, totalQuizzes);

    /**
     * 完成率算法：
     * - 若段考範圍有 quiz：overall = video*0.7 + quiz*0.3
     * - 若無 quiz：overall = video（避免因無測驗資料而誤降）
     */
    const overallCompletion =
      totalQuizzes > 0
        ? Math.round((videoCompletionRate * 0.7 + quizCompletionRate * 0.3) * 10) / 10
        : videoCompletionRate;

    return {
      studentId: s.id,
      studentName: s.name,
      className: s.class_name,
      overallCompletion,
      videoCompletionRate,
      quizCompletionRate,
      completedVideos,
      completedQuizzes,
    };
  });

  const completedStudents = studentCompletions
    .filter((s) => s.videoCompletionRate >= 100 && s.quizCompletionRate >= 100)
    .map((s) => ({ studentName: s.studentName, className: s.className }));

  const incompleteStudents = studentCompletions
    .filter((s) => !(s.videoCompletionRate >= 100 && s.quizCompletionRate >= 100))
    .sort((a, b) => a.overallCompletion - b.overallCompletion);

  const incompleteStudentCount = incompleteStudents.length;
  const riskStudents = getAtRiskStudents(studentCompletions, 30);
  const atRiskStudentCount = riskStudents.length;

  const topStudents = [...studentCompletions]
    .sort((a, b) => b.overallCompletion - a.overallCompletion)
    .slice(0, 5)
    .map((s) => ({
      name: s.studentName,
      className: s.className,
      completionRate: s.overallCompletion,
    }));

  const origin = resolvePublicOriginWithoutRequest();
  const adminLink = `${origin}/admin`;
  const weakSkills = await getWeakSkills(supabase, examScopeId);
  const threeDaysAgo = new Date(`${today}T12:00:00+08:00`);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 2);
  const recentDate = threeDaysAgo.toISOString().slice(0, 10);
  const { data: recentTasks } = await supabase
    .from("learning_tasks")
    .select("id")
    .or(`created_at.gte.${recentDate}T00:00:00+08:00,start_date.gte.${recentDate}`)
    .limit(1);
  const recentTaskCount = (recentTasks ?? []).length;
  const suggestions = buildTeacherSuggestions(
    weakSkills,
    todayViewedVideoCount,
    incompleteStudentCount,
    atRiskStudentCount,
    recentTaskCount,
    completedStudents.length,
  );

  const content = `
📊 每日學習分析（${today}）

📘 班級整體狀況
- 班級整體完成率：${classVideoCompletionRate}%
- 已完成學生：${completedStudents.length}人
- 尚未完成學生：${incompleteStudentCount}人
- 高風險學生：${atRiskStudentCount}人

━━━━━━━━━━━━━━━━━━

✅ 已完成段考範圍學生（共 ${completedStudents.length} 人）
${
  completedStudents.length > 0
    ? completedStudents
        .map((s) => `- ${s.studentName}${s.className ? `（${s.className}）` : ""}`)
        .join("\n")
    : "目前尚無學生完成全部段考範圍"
}

━━━━━━━━━━━━━━━━━━

📌 尚未完成學生（共 ${incompleteStudentCount} 人）
${
  incompleteStudents.length > 0
    ? incompleteStudents
        .map(
          (s) =>
            `- ${s.studentName}${s.className ? `（${s.className}）` : ""}：${s.overallCompletion}%`,
        )
        .join("\n")
    : "目前所有學生已完成段考範圍"
}

━━━━━━━━━━━━━━━━━━

🚨 高風險學生（完成率低於 30%）
${
  riskStudents.length > 0
    ? riskStudents
        .map(
          (s) =>
            `- ${s.studentName}${s.className ? `（${s.className}）` : ""}：${s.completionRate}%`,
        )
        .join("\n")
    : "目前無高風險學生"
}

━━━━━━━━━━━━━━━━━━

⚠️ 教學重點（弱點 TOP3）
${
  weakSkills.length > 0
    ? weakSkills
        .map(
          (s, i) =>
            `${i + 1}. ${s.skill}（錯誤率 ${(s.wrongRate * 100).toFixed(1)}%）`,
        )
        .join("\n")
    : "目前資料不足，尚無法判斷弱點"
}

━━━━━━━━━━━━━━━━━━

🏆 學習表現優秀（前5名）
${topStudents
  .map((s) => `- ${s.name}（${s.completionRate}%）`)
  .join("\n")}

━━━━━━━━━━━━━━━━━━

📉 今日學習狀況
- 今日觀看影片：${todayViewedVideoCount}
- 今日作答題目：${todayAnsweredQuestionCount}

${
  todayViewedVideoCount === 0
    ? `⚠️ 今日尚無新增學習紀錄
${recentTaskCount === 0 ? "目前三天內未新增學習任務，因此今日無新增紀錄屬正常狀況。" : ""}`
    : ""
}

━━━━━━━━━━━━━━━━━━

🧠 教學建議
${
  suggestions.length > 0
    ? suggestions.map((s) => `👉 ${s}`).join("\n")
    : "暫無建議"
}

━━━━━━━━━━━━━━━━━━

🔗 後台管理
${adminLink}
  `.trim();

  return {
    title,
    content,
    html: content,
    metrics: {
      classCount: classSet.size,
      studentCount: activeStudents.length,
      scopeVideoTotal,
      scopeVideoCompletedTotal,
      classVideoCompletionRate,
      todayViewedVideoCount,
      todayAnsweredQuestionCount,
      incompleteStudentCount,
      completedStudentCount: completedStudents.length,
      atRiskStudentCount,
      recentTaskCount,
      topStudents,
    },
    warnings,
  };
}

