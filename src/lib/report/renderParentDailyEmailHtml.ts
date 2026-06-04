import type { ParentEmailSectionKey } from "@/lib/admin/teacher-report-preferences";
import type { ParentDailyEmailReportData } from "@/lib/report/buildParentDailyEmailReport";
import { escapeHtml } from "@/lib/report/emailHtmlEscape";

function psv(d: ParentDailyEmailReportData, k: ParentEmailSectionKey): boolean {
  return d.parentSectionVisibility[k] !== false;
}

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

  const toneBlock = psv(d, "completion_rate")
      ? `<div style="padding:14px 16px;border-radius:12px;border:1px solid ${t.border};background:${t.bg};color:${t.color};font-size:15px;line-height:1.6;margin-bottom:16px">
    ${escapeHtml(t.text)}
  </div>`
      : "";

  const progressInner: string[] = [];
  if (psv(d, "completion_rate")) {
    progressInner.push(
      `<p style="margin:6px 0;font-size:15px">目前完成率：<strong style="font-size:20px;color:#0284c7">${d.completionRate}%</strong></p>`,
    );
  }
  if (psv(d, "class_average")) {
    progressInner.push(`<p style="margin:6px 0;font-size:15px">班級平均：${escapeHtml(classAvgText)}</p>`);
  }
  if (psv(d, "completion_rate") || psv(d, "class_average")) {
    progressInner.push(
      `<p style="margin:6px 0;font-size:15px"><span style="color:#64748b">範圍：</span>${escapeHtml(d.examScopeTitle)}</p>`,
    );
  }

  const progressBlock =
    progressInner.length > 0
      ? `<div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 10px 0;font-weight:700;font-size:16px">📊 段考預習進度</p>
    ${progressInner.join("")}
  </div>`
      : "";

  const todayParts: string[] = [];
  if (psv(d, "today_videos")) {
    todayParts.push(`<p style="margin:6px 0;font-size:15px">今日觀看影片：${d.todayWatchedVideos} 部</p>`);
  }
  if (psv(d, "today_questions")) {
    todayParts.push(`<p style="margin:6px 0;font-size:15px">今日作答題目：${d.todayAnsweredQuestions} 題</p>`);
  }
  if (psv(d, "today_accuracy")) {
    todayParts.push(`<p style="margin:6px 0;font-size:15px">今日答對率：${escapeHtml(accText)}</p>`);
  }
  const todayBlock =
    todayParts.length > 0
      ? `<div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 10px 0;font-weight:700;font-size:16px">🎥 今日學習狀況</p>
    ${todayParts.join("")}
  </div>`
      : "";

  const incompleteBlock = psv(d, "incomplete_videos_hint")
    ? `<div style="padding:18px 20px;background:#fffbeb;border-radius:16px;border:1px solid #fde68a;margin-bottom:14px">
    <p style="margin:0 0 8px 0;font-weight:700;font-size:16px;color:#92400e">📼 影片完成提醒</p>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#0f172a">${escapeHtml(d.incompleteVideosHint)}</p>
  </div>`
    : "";

  const weakSection = psv(d, "weak_skills")
    ? `<div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 10px 0;font-weight:700;font-size:16px">⚠️ 目前需要加強</p>
    ${weakBlock}
  </div>`
    : "";

  const tonightBlock =
    psv(d, "tonight_tasks") || psv(d, "recommended_video")
      ? `<div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 10px 0;font-weight:700;font-size:16px">🧠 建議今晚完成</p>
    ${psv(d, "recommended_video") ? `<p style="margin:6px 0;font-size:15px">推薦影片：${escapeHtml(d.recommendedVideoTitle)}</p>` : ""}
    ${psv(d, "tonight_tasks") ? `<p style="margin:6px 0;font-size:15px">推薦技能：${escapeHtml(d.recommendedSkillLabel)}</p>` : ""}
  </div>`
      : "";

  const teacherNoteBlock =
    psv(d, "teacher_note") && d.teacherMessage && d.teacherMessage.trim()
      ? `<div style="padding:18px 20px;background:#eff6ff;border-radius:16px;border:1px solid #bfdbfe;margin-bottom:14px">
    <p style="margin:0 0 8px 0;font-weight:700;font-size:16px;color:#1e40af">✉️ 老師提醒</p>
    <p style="margin:0;font-size:15px;line-height:1.65;color:#0f172a;white-space:pre-wrap">${escapeHtml(d.teacherMessage.trim())}</p>
  </div>`
      : "";

  const questionUpdateBlock =
    psv(d, "question_updates") && d.questionUpdateUnreadCount > 0
      ? (() => {
          const lines =
            d.questionUpdateVideoTitles.length > 0
              ? d.questionUpdateVideoTitles.map((t) => `<li>${escapeHtml(t)}</li>`).join("")
              : `<li>請登入後至「學習任務」查看「題目已更新」專區。</li>`;
          return `<div style="padding:18px 20px;background:#fffbeb;border-radius:16px;border:1px solid #fcd34d;margin-bottom:14px">
    <p style="margin:0 0 8px 0;font-weight:700;font-size:16px;color:#92400e">🆕 題目更新提醒</p>
    <p style="margin:0 0 10px 0;font-size:15px;line-height:1.65;color:#0f172a">本週有 <strong>${d.questionUpdateUnreadCount}</strong> 題測驗經老師優化。建議孩子重新挑戰以下內容：</p>
    <ul style="margin:0;padding-left:20px;color:#0f172a;font-size:15px;line-height:1.7">${lines}</ul>
  </div>`;
        })()
      : "";

  return `
<div style="max-width:560px;margin:0 auto;padding:24px 16px;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;color:#0f172a">
  <div style="padding:20px 22px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0 0 8px 0;font-size:16px;font-weight:700;color:#0369a1">📘 AI 學習追蹤通知</p>
    <p style="margin:0;color:#64748b;font-size:14px">📅 ${escapeHtml(d.dateLabel)}（台北時間）</p>
    <p style="margin:10px 0 0 0;color:#475569;font-size:14px">範圍：${escapeHtml(d.examScopeTitle)}</p>
  </div>

  <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6">${greet}</p>

  <div style="padding:18px 20px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;margin-bottom:14px">
    <p style="margin:0;font-size:16px">👨‍🎓 學生：<strong>${escapeHtml(d.studentName)}</strong>（${escapeHtml(d.classDisplay)}）</p>
  </div>

  ${toneBlock}
  ${progressBlock}
  ${todayBlock}
  ${incompleteBlock}
  ${weakSection}
  ${tonightBlock}
  ${teacherNoteBlock}
  ${questionUpdateBlock}

  <div style="height:1px;background:#cbd5e1;margin:16px 0"></div>

  <p style="margin:0 0 8px 0;font-weight:700;font-size:15px">🔗 進入學習系統</p>
  ${loginBtn}

  <p style="text-align:center;font-size:12px;color:#94a3b8;margin:16px 0 0 0">本摘要僅供您關心孩子學習使用，不含其他學生姓名、全班排名或老師內部管理連結。</p>
</div>`.trim();
}
