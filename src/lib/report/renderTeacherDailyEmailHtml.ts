import type { TeacherDailyEmailReportData } from "@/lib/report/buildTeacherDailyEmailReport";
import { escapeHtml } from "@/lib/report/emailHtmlEscape";

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

  const suggestBlock =
    d.suggestions.length > 0
      ? `<ul style="margin:0;padding-left:20px;color:#0f172a">${d.suggestions.map((s) => `<li style="margin:6px 0">${escapeHtml(s)}</li>`).join("")}</ul>`
      : `<p style="margin:0;color:#64748b">暫無建議。</p>`;

  const taskAppendix =
    d.hasRecentTasks && d.taskTrackingAppendixHtml
      ? `<div style="margin-top:24px;padding:20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0">
          <h2 style="margin:0 0 12px 0;font-size:18px;color:#0f172a">學習任務追蹤</h2>
          ${d.taskTrackingAppendixHtml}
        </div>`
      : "";

  return `
<div style="max-width:720px;margin:0 auto;padding:24px 16px;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#0f172a">
  <div style="text-align:center;margin-bottom:20px">
    <div style="display:inline-block;padding:10px 18px;background:#0ea5e9;color:#ffffff;border-radius:999px;font-size:15px;font-weight:700">國二理化｜老師每日報表</div>
  </div>
  <p style="text-align:center;margin:0 0 8px 0;color:#475569;font-size:14px">${escapeHtml(d.examScopeTitle)}</p>
  <p style="text-align:center;margin:0 0 20px 0;color:#64748b;font-size:14px">📅 ${escapeHtml(d.dateLabel)}（台北時間）</p>
  ${warnBlock}

  <div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 14px 0;font-size:18px;color:#0f172a">📘 班級整體狀況</h2>
    <table width="100%" style="border-collapse:collapse;font-size:15px">
      <tr><td style="padding:8px 0;color:#64748b">班級完成率（學生平均）</td><td style="padding:8px 0;text-align:right;font-size:22px;font-weight:800;color:#0284c7">${d.classVideoCompletionRate}%</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">已完成學生數</td><td style="padding:8px 0;text-align:right;font-weight:700">${d.completedStudentCount} 人</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">尚未完成學生數</td><td style="padding:8px 0;text-align:right;font-weight:700">${d.incompleteStudentCount} 人</td></tr>
      <tr><td style="padding:8px 0;color:#64748b">高風險學生數（&lt;30%）</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#dc2626">${d.atRiskStudentCount} 人</td></tr>
    </table>
  </div>

  <div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#15803d">✅ 已完成學生名單</h2>
    ${completedList}
  </div>

  <div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a">📌 尚未完成學生</h2>
    ${incompleteList}
  </div>

  <div style="padding:22px;background:#fff1f2;border-radius:16px;border:1px solid #fecdd3;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#b91c1c">🚨 高風險學生（完成率 &lt; 30%）</h2>
    ${riskList}
  </div>

  <div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
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
  </div>

  <div style="padding:22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#0f172a">📉 今日學習狀況（全班）</h2>
    <p style="margin:6px 0;font-size:15px">今日觀看影片數（不重複）：<strong>${d.todayViewedVideoCount}</strong> 部</p>
    <p style="margin:6px 0;font-size:15px">今日作答題目數：<strong>${d.todayAnsweredQuestionCount}</strong> 題</p>
  </div>

  <div style="padding:22px;background:#f0fdf4;border-radius:16px;border:1px solid #bbf7d0;margin-bottom:16px">
    <h2 style="margin:0 0 12px 0;font-size:17px;color:#166534">🧠 教學建議</h2>
    ${suggestBlock}
  </div>

  <div style="text-align:center;margin:24px 0 8px 0">
    <a href="${escapeHtml(d.adminUrl)}" style="display:inline-block;padding:14px 28px;background:#0f172a;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px">進入後台管理</a>
  </div>
  <p style="text-align:center;font-size:12px;color:#94a3b8;margin:0">此信僅供教學管理使用，請勿轉發給家長。</p>

  ${taskAppendix}
</div>`.trim();
}
