import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { resolvePublicOriginWithoutRequest } from "@/lib/report/reportOrigin";

export type DailyOverviewReport = {
  title: string;
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

  let scopeVideoIds: string[] = [];
  if (!examScopeId) {
    warnings.push("找不到啟用中的 exam_scopes，無法以段考範圍計算完成率。");
  } else {
    const { data: units } = await supabase
      .from("scope_units")
      .select("id")
      .eq("exam_scope_id", examScopeId);
    const unitIds = (units ?? []).map((u: { id: string }) => u.id);
    if (unitIds.length > 0) {
      const { data: vids } = await supabase.from("videos").select("id").in("unit_id", unitIds);
      scopeVideoIds = [...new Set((vids ?? []).map((v: { id: string }) => v.id))];
    }
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

  const html = `
    <h2 style="margin:0 0 8px 0">每日學習分析總覽（${escapeHtml(new Date().toLocaleDateString("zh-TW"))}）</h2>
    <p style="margin:0 0 12px 0;color:#334155">
      段考範圍：${examScopeId ? "以啟用中的 exam_scope 統計" : "（未設定）"}
    </p>

    <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;margin:8px 0 16px 0">
      <tr><th align="left">班級整體完成率</th><td>${classVideoCompletionRate}%</td></tr>
      <tr><th align="left">今日觀看影片數</th><td>${todayViewedVideoCount}</td></tr>
      <tr><th align="left">今日作答題目數</th><td>${todayAnsweredQuestionCount}</td></tr>
      <tr><th align="left">未完成學生數</th><td>${incompleteStudentCount}</td></tr>
    </table>

    <h3 style="margin:0 0 8px 0">完成率前 5 名（段考範圍影片）</h3>
    <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;margin:8px 0 16px 0">
      <tr><th align="left">學生</th><th align="left">班級</th><th align="left">完成率</th></tr>
      ${
        topStudents.length === 0
          ? `<tr><td colspan="3">目前沒有可統計學生資料。</td></tr>`
          : topStudents
              .map(
                (s) =>
                  `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(s.className ?? "未分班")}</td><td>${s.completionRate}%</td></tr>`,
              )
              .join("")
      }
    </table>

    <p style="margin:0;color:#0f172a">
      後台連結：<a href="${escapeHtml(adminLink)}">${escapeHtml(adminLink)}</a>
    </p>
  `;

  return {
    title,
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

