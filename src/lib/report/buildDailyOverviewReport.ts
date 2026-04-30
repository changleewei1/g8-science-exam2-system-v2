import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import {
  buildTeacherSuggestions,
  getAtRiskStudents,
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
    topStudents: { name: string; className: string | null; completionRate: number }[];
  };
  warnings: string[];
};

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function ymdTaipei(d = new Date()): string {
  const p = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(d);
  // sv-SE gives YYYY-MM-DD
  return p;
}

export async function buildDailyOverviewReport(): Promise<DailyOverviewReport> {
  const supabase = getSupabaseAdmin();
  const warnings: string[] = [];

  const today = ymdTaipei();
  const title = "【國二理化】每日學習分析總覽";

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_name, is_active")
    .eq("is_active", true);
  const activeStudents = (students ?? []) as { id: string; name: string; class_name: string | null }[];
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

  // 各學生完成率（前 5 名）
  const topStudents = activeStudents
    .map((s) => {
      const done = completedByStudent.get(s.id) ?? 0;
      return { name: s.name, className: s.class_name, completionRate: toPercent(done, scopeVideoTotal) };
    })
    .sort((a, b) => b.completionRate - a.completionRate)
    .slice(0, 5);

  // 未完成學生數（段考範圍影片完成率 < 100）
  const incompleteStudentCount = activeStudents.filter((s) => {
    const done = completedByStudent.get(s.id) ?? 0;
    return scopeVideoTotal > 0 && done < scopeVideoTotal;
  }).length;

  const origin = resolvePublicOriginWithoutRequest();
  const adminLink = `${origin}/admin`;
  const weakSkills = await getWeakSkills(supabase, examScopeId);
  const riskStudents = await getAtRiskStudents(supabase);
  const suggestions = buildTeacherSuggestions(
    weakSkills,
    todayViewedVideoCount,
    incompleteStudentCount,
  );

  const content = `
📊 每日學習分析（${today}）

📘 班級整體狀況
- 完成率：${classVideoCompletionRate}%
- 未完成學生：${incompleteStudentCount}人

${incompleteStudentCount > 10 ? "⚠️ 未完成學生偏多，需關注\n" : ""}

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

👤 高風險學生（需關注）
${
  riskStudents.length > 0
    ? riskStudents
        .map(
          (s) =>
            `- ${s.student_name}${s.class_name ? `（${s.class_name}）` : ""}（完成率 ${(s.completion_rate * 100).toFixed(0)}%）`,
        )
        .join("\n")
    : "目前無明顯風險學生"
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

${todayViewedVideoCount === 0 ? "⚠️ 今日無學生學習紀錄\n" : ""}

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

  const html = escapeHtml(content);

  return {
    title,
    content,
    html,
    metrics: {
      classCount: classSet.size,
      studentCount: activeStudents.length,
      scopeVideoTotal,
      scopeVideoCompletedTotal,
      classVideoCompletionRate,
      todayViewedVideoCount,
      todayAnsweredQuestionCount,
      incompleteStudentCount,
      topStudents,
    },
    warnings,
  };
}

