import { buildDailyOverviewPayload } from "@/lib/report/buildDailyOverviewPayload";

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

export async function buildDailyOverviewReport(): Promise<DailyOverviewReport> {
  const p = await buildDailyOverviewPayload();
  const today = p.today;
  const title = p.title;

  const completedStudents = p.completedStudents;
  const incompleteStudents = p.incompleteStudents;
  const riskStudents = p.riskStudents;

  const content = `
📊 每日學習分析（${today}）

📘 班級整體狀況
- 班級整體完成率：${p.classVideoCompletionRate}%
- 已完成學生：${completedStudents.length}人
- 尚未完成學生：${p.incompleteStudentCount}人
- 高風險學生：${p.atRiskStudentCount}人

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

📌 尚未完成學生（共 ${p.incompleteStudentCount} 人）
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
  p.weakSkills.length > 0
    ? p.weakSkills
        .map(
          (s, i) =>
            `${i + 1}. ${s.skill}（錯誤率 ${(s.wrongRate * 100).toFixed(1)}%）`,
        )
        .join("\n")
    : "目前資料不足，尚無法判斷弱點"
}

━━━━━━━━━━━━━━━━━━

🏆 學習表現優秀（前5名）
${p.topStudents.map((s) => `- ${s.name}（${s.completionRate}%）`).join("\n")}

━━━━━━━━━━━━━━━━━━

📉 今日學習狀況
- 今日觀看影片：${p.todayViewedVideoCount}
- 今日作答題目：${p.todayAnsweredQuestionCount}

${
  p.todayViewedVideoCount === 0
    ? `⚠️ 今日尚無新增學習紀錄
${p.recentTaskCount === 0 ? "目前三天內未新增學習任務，因此今日無新增紀錄屬正常狀況。" : ""}`
    : ""
}

━━━━━━━━━━━━━━━━━━

🧠 教學建議
${
  p.suggestions.length > 0
    ? p.suggestions.map((s) => `👉 ${s}`).join("\n")
    : "暫無建議"
}

━━━━━━━━━━━━━━━━━━

🔗 後台管理
${p.adminLink}
  `.trim();

  return {
    title,
    content,
    html: content,
    metrics: {
      classCount: p.classCount,
      studentCount: p.activeStudents.length,
      scopeVideoTotal: p.scopeVideoTotal,
      scopeVideoCompletedTotal: p.scopeVideoCompletedTotal,
      classVideoCompletionRate: p.classVideoCompletionRate,
      todayViewedVideoCount: p.todayViewedVideoCount,
      todayAnsweredQuestionCount: p.todayAnsweredQuestionCount,
      incompleteStudentCount: p.incompleteStudentCount,
      completedStudentCount: p.completedStudentCount,
      atRiskStudentCount: p.atRiskStudentCount,
      recentTaskCount: p.recentTaskCount,
      topStudents: p.topStudents,
    },
    warnings: p.warnings,
  };
}
