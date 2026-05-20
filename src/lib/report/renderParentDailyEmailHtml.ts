import type { ParentDailyEmailReportData } from "@/lib/report/buildParentDailyEmailReport";
import { escapeHtml } from "@/lib/report/emailHtmlEscape";

function toneMessage(mode: ParentDailyEmailReportData["toneMode"]): { text: string; bg: string; border: string; color: string } {
  if (mode === "encourage") {
    return {
      text: "👍 孩子目前進度良好，請持續保持每日預習與複習習慣。",
      bg: "#f0fdf4",
      border: "#bbf7d0",
      color: "#166534",
    };
  }
  if (mode === "remind") {
    return {
      text: "📌 孩子目前仍有部分段考範圍尚未完成，建議這幾天每天安排 15～30 分鐘完成影片與技能練習。",
      bg: "#fff7ed",
      border: "#fed7aa",
      color: "#9a3412",
    };
  }
  return {
    text: "🚨 孩子目前預習進度明顯落後，建議今晚先完成系統推薦的影片，避免後續上課跟不上。",
    bg: "#fef2f2",
    border: "#fecaca",
    color: "#b91c1c",
  };
}

export function renderParentDailyEmailHtml(d: ParentDailyEmailReportData): string {
  const t = toneMessage(d.toneMode);
  const classAvgText =
    d.classAveragePercent != null ? `${d.classAveragePercent}%` : "—";
  const accText =
    d.todayAccuracyPercent != null ? `${d.todayAccuracyPercent}%` : "今日尚無測驗作答或無法計算";

  const weakBlock = d.weakSkillsInsufficient
    ? `<p style="margin:0;color:#64748b;font-size:15px;line-height:1.6">目前尚無明顯弱點，請持續完成影片與測驗。</p>`
    : `<ul style="margin:0;padding-left:20px;color:#0f172a;font-size:15px;line-height:1.7">${d.weakSkillLines
        .map((line) => `<li>${escapeHtml(line)}</li>`)
        .join("")}</ul>`;

  const loginBtn = d.studentLoginUrl
    ? `<div style="text-align:center;margin:24px 0 8px 0">
        <a href="${escapeHtml(d.studentLoginUrl)}" style="display:inline-block;padding:14px 28px;background:#0284c7;color:#ffffff;text-decoration:none;border-radius:12px;font-weight:700;font-size:15px">進入學習系統</a>
      </div>`
    : `<p style="text-align:center;color:#64748b;font-size:14px">登入網址尚未設定，請向補習班索取學習平台連結。</p>`;

  const greet = d.guardianName ? `${escapeHtml(d.guardianName)} 您好，` : "家長您好，";

  return `
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#0f172a">
  <div style="padding:20px 22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#0369a1">📘 AI 學習追蹤通知</p>
    <p style="margin:0;color:#64748b;font-size:14px">📅 ${escapeHtml(d.dateLabel)}（台北時間）</p>
  </div>

  <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6">${greet}</p>

  <div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0;font-size:16px">👨‍🎓 學生：<strong>${escapeHtml(d.studentName)}</strong>（${escapeHtml(d.classDisplay)}）</p>
  </div>

  <div style="padding:14px 16px;border-radius:12px;border:1px solid ${t.border};background:${t.bg};color:${t.color};font-size:15px;line-height:1.6;margin-bottom:16px">
    ${escapeHtml(t.text)}
  </div>

  <div style="height:1px;background:#cbd5e1;margin:16px 0"></div>

  <div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 10px 0;font-weight:700;font-size:16px">📊 段考預習進度</p>
    <p style="margin:6px 0;font-size:15px"><span style="color:#64748b">範圍：</span>${escapeHtml(d.examScopeTitle)}</p>
    <p style="margin:6px 0;font-size:15px">目前完成率：<strong style="font-size:20px;color:#0284c7">${d.completionRate}%</strong></p>
    <p style="margin:6px 0;font-size:15px">班級平均：${escapeHtml(classAvgText)}</p>
  </div>

  <div style="height:1px;background:#cbd5e1;margin:16px 0"></div>

  <div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 10px 0;font-weight:700;font-size:16px">🎥 今日學習狀況</p>
    <p style="margin:6px 0;font-size:15px">今日觀看影片：${d.todayWatchedVideos} 部</p>
    <p style="margin:6px 0;font-size:15px">今日作答題目：${d.todayAnsweredQuestions} 題</p>
    <p style="margin:6px 0;font-size:15px">今日答對率：${escapeHtml(accText)}</p>
  </div>

  <div style="height:1px;background:#cbd5e1;margin:16px 0"></div>

  <div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 10px 0;font-weight:700;font-size:16px">⚠️ 目前需要加強</p>
    ${weakBlock}
  </div>

  <div style="height:1px;background:#cbd5e1;margin:16px 0"></div>

  <div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 10px 0;font-weight:700;font-size:16px">🧠 建議今晚完成</p>
    <p style="margin:6px 0;font-size:15px">推薦影片：${escapeHtml(d.recommendedVideoTitle)}</p>
    <p style="margin:6px 0;font-size:15px">推薦技能：${escapeHtml(d.recommendedSkillLabel)}</p>
  </div>

  <div style="height:1px;background:#cbd5e1;margin:16px 0"></div>

  <p style="margin:0 0 8px 0;font-weight:700;font-size:15px">🔗 進入學習系統</p>
  ${loginBtn}

  <p style="text-align:center;font-size:12px;color:#94a3b8;margin:16px 0 0 0">本摘要僅供您關心孩子學習使用，不含其他學生資料。</p>
</div>`.trim();
}
