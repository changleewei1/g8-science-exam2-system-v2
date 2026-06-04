import type { TeacherDailyEmailReportData } from "@/lib/report/buildTeacherDailyEmailReport";
import type { TeacherEmailSectionKey } from "@/lib/admin/teacher-report-preferences";
import { escapeHtml } from "@/lib/report/emailHtmlEscape";

function sec(d: TeacherDailyEmailReportData, k: TeacherEmailSectionKey): boolean {
  return d.sectionVisibility[k] !== false;
}

function liStudent(name: string, cls: string | null, extra?: string): string {
  const c = cls ? `（${escapeHtml(cls)}）` : "";
  const e = extra ? ` ${escapeHtml(extra)}` : "";
  return `<li style="margin:4px 0">${escapeHtml(name)}${c}${e}</li>`;
}

export function renderTeacherDailyEmailHtml(d: TeacherDailyEmailReportData): string {
  const warnBlock =
    d.warnings.length > 0
      ? `<div style="margin:16px 0;padding:12px 14px;background:#fff7ed;border:1px solid #fdba74;border-radius:12px;color:#9a3412;font-size:14px">
          <strong>系統提醒</strong>
          <ul style="margin:8px 0 0 18px;padding:0">${d.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join("")}</ul>
        </div>`
      : "";

  const weakRows =
    d.weakSkillsTop3.length > 0
      ? d.weakSkillsTop3
          .map(
            (w, i) => `<tr>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${escapeHtml(w.skillName)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${w.wrongRatePercent}%</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0">${w.affectedStudentCount} 人</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="4" style="padding:12px;color:#64748b">目前資料不足，尚無法判斷弱點。</td></tr>`;

  const skillBreakRows =
    d.skillBreakdownRows.length > 0
      ? d.skillBreakdownRows
          .map(
            (w, i) => `<tr>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${i + 1}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0;font-weight:600">${escapeHtml(w.skillName)}</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${w.wrongRatePercent}%</td>
            <td style="padding:8px 10px;border-bottom:1px solid #e2e8f0">${w.affectedStudentCount} 人</td>
          </tr>`,
          )
          .join("")
      : `<tr><td colspan="4" style="padding:12px;color:#64748b">尚無足夠作答資料。</td></tr>`;

  const completedList =
    d.completedStudents.length > 0
      ? `<ul style="margin:0;padding-left:20px">${d.completedStudents.map((s) => liStudent(s.name, s.className)).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">目前尚無學生完成全部段考範圍。</p>`;

  const incompleteList =
    d.incompleteStudents.length > 0
      ? `<ul style="margin:0;padding-left:20px">${d.incompleteStudents.map((s) => liStudent(s.name, s.className, `：${s.completionRate}%`)).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">目前所有學生已完成段考範圍。</p>`;

  const riskList =
    d.atRiskStudents.length > 0
      ? `<ul style="margin:0;padding-left:20px;color:#b91c1c">${d.atRiskStudents.map((s) => liStudent(s.name, s.className, `：${s.completionRate}%`)).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">目前無高風險學生（完成率皆 ≥30%）。</p>`;

  const top5List =
    d.topStudents.length > 0
      ? `<ul style="margin:0;padding-left:20px">${d.topStudents.map((s) => liStudent(s.name, s.className, `：${s.completionRate}%`)).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">尚無排名資料。</p>`;

  const suggestBlock =
    d.suggestions.length > 0
      ? `<ul style="margin:0;padding-left:20px;color:#0f172a">${d.suggestions.map((s) => `<li style="margin:6px 0">${escapeHtml(s)}</li>`).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">暫無建議。</p>`;

  const unwatchedBlock =
    d.unwatchedLines.length > 0
      ? `<ul style="margin:0;padding-left:20px;font-size:14px">${d.unwatchedLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">目前無未觀看影片統計（或全班已完成）。</p>`;

  const incompleteTasksBlock =
    d.incompleteTaskLines.length > 0
      ? `<ul style="margin:0;padding-left:20px;font-size:14px">${d.incompleteTaskLines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">目前沒有進行中的學習任務未完成名單。</p>`;

  const modeBadge = `<div style="text-align:center;margin:8px 0 16px">
    <span style="display:inline-block;padding:8px 14px;background:#eef2ff;border:1px solid #c7d2fe;border-radius:999px;font-size:13px;font-weight:700;color:#3730a3">報表模式：${escapeHtml(d.reportModeLabel)}</span>
  </div>`;

  const quizCompletionRow =
    d.reportMode === "preview"
      ? `<tr><td style="padding:8px 0;color:#64748b">班級平均「影片測驗」完成率</td><td style="padding:8px 0;text-align:right;font-weight:700">${d.classQuizAveragePercent}%</td></tr>`
      : "";

  const practiceModeBlock =
    d.reportMode === "practice" && d.skillPracticeLines.length > 0
      ? `<div style="padding:22px;background:#faf5ff;border-radius:16px;border:1px solid #e9d5ff;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#5b21b6">🌿 練習模式｜技能樹熟練度與錯誤率</h2>
    <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.65;color:#0f172a">${d.skillPracticeLines
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("")}</ul>
  </div>`
      : "";

  const reviewModeBlock =
    d.reportMode === "review" && d.reviewHighlightLines.length > 0
      ? `<div style="padding:22px;background:#f0fdf4;border-radius:16px;border:1px solid #bbf7d0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#14532d">📚 複習模式｜歷史錯題與補強方向</h2>
    <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.65;color:#0f172a">${d.reviewHighlightLines
      .map((line) => `<li>${escapeHtml(line)}</li>`)
      .join("")}</ul>
  </div>`
      : "";

  const taskAppendix =
    d.hasRecentTasks && d.taskTrackingAppendixHtml && sec(d, "incomplete_tasks")
      ? `<div style="margin-top:24px;padding:20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
          <h2 style="margin:0 0 12px 0;font-size:18px;color:#0f172a">學習任務追蹤</h2>
          ${d.taskTrackingAppendixHtml}
        </div>`
      : "";

  const classOverviewBlock = sec(d, "class_avg_completion")
    ? `<div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 14px 0;font-size:18px;color:#0f172a">📘 班級整體狀況</h2>
    <table width="100%" style="border-collapse:collapse;font-size:15px">
      <tr><td style="padding:8px 0;color:#64748b">班級完成率（學生平均）</td><td style="padding:8px 0;text-align:right;font-size:22px;font-weight:800;color:#0284c7">${d.classVideoCompletionRate}%</td></tr>
      ${quizCompletionRow}
      <tr><td style="padding:8px 0;color:#64748b">已完成學生數</td><td style="padding:8px 0;text-align:right;font-weight:700">${d.completedStudentCount} 人</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">尚未完成學生數</td><td style="padding:8px 0;text-align:right;font-weight:700">${d.incompleteStudentCount} 人</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">高風險學生數（&lt;30%）</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#dc2626">${d.atRiskStudentCount} 人</td></tr>
    </table>
  </div>`
    : "";

  const todayInner: string[] = [];
  if (sec(d, "today_videos")) {
    todayInner.push(
      `<p style="margin:6px 0;font-size:15px">今日觀看影片數（不重複）：<strong>${d.todayViewedVideoCount}</strong> 部</p>`,
    );
  }
  if (sec(d, "today_questions")) {
    todayInner.push(
      `<p style="margin:6px 0;font-size:15px">今日作答題目數：<strong>${d.todayAnsweredQuestionCount}</strong> 題</p>`,
    );
  }
  const todayBlock =
    todayInner.length > 0
      ? `<div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a">📉 今日學習狀況（全班）</h2>
    ${todayInner.join("")}
  </div>`
      : "";

  const questionQualityBlock = `<div style="padding:22px;background:#fff7ed;border-radius:16px;border:1px solid #fdba74;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#9a3412">📌 題目品質警示</h2>
    <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.75;color:#431407">
      <li>今日收到題目回饋：<strong>${d.questionQualityTodayFeedback}</strong> 筆</li>
      <li>需要修正（待審）題目數：<strong>${d.questionQualityNeedsReview}</strong> 題</li>
      <li>今日已自動隱藏（品質分過低）題目數：<strong>${d.questionQualityAutoHiddenToday}</strong> 題</li>
      <li>AI 產題可信度低於 70 的題目數：<strong>${d.questionQualityLowAiConfidence}</strong> 題</li>
    </ul>
    <p style="margin:12px 0 0 0;font-size:12px;color:#78716c">本段僅供教師檢視，不會出現在家長信中。</p>
  </div>`;

  const completedBlock = sec(d, "completed_list")
    ? `<div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#15803d">✅ 已完成學生名單</h2>
    ${completedList}
  </div>`
    : "";

  const incompleteBlock = sec(d, "incomplete_list")
    ? `<div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a">📌 尚未完成學生</h2>
    ${incompleteList}
  </div>`
    : "";

  const riskBlock = sec(d, "risk_list")
    ? `<div style="padding:22px;background:#fff1f2;border-radius:16px;border:1px solid #fecdd3;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#b91c1c">🚨 高風險學生（完成率 &lt; 30%）</h2>
    ${riskList}
  </div>`
    : "";

  const top5Block = sec(d, "top5")
    ? `<div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a">🏆 學習表現前 5 名</h2>
    ${top5List}
  </div>`
    : "";

  const weakTopBlock = sec(d, "weak_top3")
    ? `<div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a">⚠️ 教學弱點 TOP3</h2>
    <table width="100%" style="border-collapse:collapse;font-size:14px">
      <tr style="background:#f8fafc;text-align:left">
        <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">#</th>
        <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">技能</th>
        <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">錯誤率</th>
        <th style="padding:10px 12px;border-bottom:1px solid #e2e8f0">影響學生數</th>
      </tr>
      ${weakRows}
    </table>
  </div>`
    : "";

  const skillBreakBlock = sec(d, "skill_error_breakdown")
    ? `<div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a">📊 Skill 錯誤率分析</h2>
    <table width="100%" style="border-collapse:collapse;font-size:13px">
      <tr style="background:#f8fafc;text-align:left">
        <th style="padding:8px 10px;border-bottom:1px solid #e2e8f0">#</th>
        <th style="padding:8px 10px;border-bottom:1px solid #e2e8f0">技能</th>
        <th style="padding:8px 10px;border-bottom:1px solid #e2e8f0">錯誤率</th>
        <th style="padding:8px 10px;border-bottom:1px solid #e2e8f0">影響學生數</th>
      </tr>
      ${skillBreakRows}
    </table>
  </div>`
    : "";

  const unwatchedBlockWrapped = sec(d, "unwatched_summary")
    ? `<div style="padding:22px;background:#f8fafc;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a">🎬 未觀看影片統計（摘要）</h2>
    ${unwatchedBlock}
  </div>`
    : "";

  const incompleteTasksWrapped = sec(d, "incomplete_tasks")
    ? `<div style="padding:22px;background:#fffbeb;border-radius:16px;border:1px solid #fde68a;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#92400e">📋 未完成任務學生</h2>
    ${incompleteTasksBlock}
  </div>`
    : "";

  const suggestWrapped = sec(d, "suggestions")
    ? `<div style="padding:22px;background:#f0fdf4;border-radius:16px;border:1px solid #bbf7d0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#166534">🧠 教學建議</h2>
    ${suggestBlock}
  </div>`
    : "";

  const adminBlock = sec(d, "admin_link")
    ? `<div style="text-align:center;margin:24px 0 8px 0">
    <a href="${escapeHtml(d.adminUrl)}" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px">進入後台管理</a>
  </div>
  <p style="text-align:center;font-size:12px;color:#94a3b8;margin:0">此信僅供教學管理使用，請勿轉發給家長。</p>`
    : `<p style="text-align:center;font-size:12px;color:#94a3b8;margin:16px 0 0 0">此信僅供教學管理使用，請勿轉發給家長。</p>`;

  return `
<div style="max-width:720px;margin:0 auto;padding:24px 16px;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#0f172a">
  <div style="text-align:center;margin-bottom:20px">
    <div style="display:inline-block;padding:10px 18px;background:#0ea5e9;color:#ffffff;border-radius:999px;font-size:15px;font-weight:700">國二理化｜老師每日報表</div>
  </div>
  <p style="text-align:center;margin:0 0 8px 0;color:#475569;font-size:14px">${escapeHtml(d.examScopeTitle)}</p>
  ${
    d.scopeUnitTitles.length > 0
      ? `<div style="margin:0 auto 16px;max-width:560px;padding:14px 16px;background:#ecfeff;border:1px solid #a5f3fc;border-radius:12px;text-align:left">
    <p style="margin:0 0 8px 0;font-size:14px;font-weight:700;color:#0e7490">📚 本報告段考範圍</p>
    <ul style="margin:0;padding-left:20px;color:#164e63;font-size:14px;line-height:1.65">${d.scopeUnitTitles
      .map((t) => `<li>${escapeHtml(t)}</li>`)
      .join("")}</ul>
  </div>`
      : ""
  }
  <p style="text-align:center;margin:0 0 20px 0;color:#64748b;font-size:14px">📅 ${escapeHtml(d.dateLabel)}（台北時間）</p>
  ${modeBadge}
  ${warnBlock}

  ${classOverviewBlock}
  ${todayBlock}
  ${questionQualityBlock}
  ${practiceModeBlock}
  ${completedBlock}
  ${incompleteBlock}
  ${riskBlock}
  ${top5Block}
  ${weakTopBlock}
  ${skillBreakBlock}
  ${unwatchedBlockWrapped}
  ${incompleteTasksWrapped}
  ${reviewModeBlock}
  ${suggestWrapped}
  ${adminBlock}

  ${taskAppendix}
</div>`.trim();
}
