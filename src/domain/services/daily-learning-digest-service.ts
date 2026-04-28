import { ClassWeaknessAnalysisService } from "@/domain/services/class-weakness-analysis-service";
import { ParentDigestTextService } from "@/domain/services/parent-digest-text-service";
import {
  StudentWeaknessAnalysisService,
  type StudentDigestRow,
} from "@/domain/services/student-weakness-analysis-service";

export type DailyLearningDigestResult = {
  subject: string;
  html: string;
  totals: {
    classCount: number;
    studentCount: number;
    incompleteStudentCount: number;
  };
  warnings: string[];
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export class DailyLearningDigestService {
  constructor(
    private readonly studentSvc = new StudentWeaknessAnalysisService(),
    private readonly classSvc = new ClassWeaknessAnalysisService(),
    private readonly parentTextSvc = new ParentDigestTextService(),
  ) {}

  async build(): Promise<DailyLearningDigestResult> {
    const analysis = await this.studentSvc.analyzeDailyDigest();
    const students = analysis.students;
    const warnings = [...analysis.warnings];
    const date = new Date().toLocaleDateString("zh-TW");

    if (students.length === 0) {
      const html = `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
          <h2>每日學習報告（${escapeHtml(date)}）</h2>
          <p>今天沒有可用學生資料，請確認 students 資料表是否已有啟用學生。</p>
        </div>
      `;
      return {
        subject: `每日學習報告（${date}）`,
        html,
        totals: { classCount: 0, studentCount: 0, incompleteStudentCount: 0 },
        warnings: warnings.length ? warnings : ["沒有學生資料。"],
      };
    }

    const byClass = new Map<string, StudentDigestRow[]>();
    for (const s of students) {
      const classKey = s.className || "未分班";
      const list = byClass.get(classKey) ?? [];
      list.push(s);
      byClass.set(classKey, list);
    }

    const classBlocks = [...byClass.entries()].map(([className, classStudents]) => {
      const byStudentSkill = new Map<string, Map<string, { total: number; correct: number }>>();
      for (const student of classStudents) {
        const skillMap = analysis.byStudentSkill.get(student.studentId);
        if (skillMap) byStudentSkill.set(student.studentId, skillMap);
      }
      const classWeaknesses = this.classSvc.analyze({
        byStudentSkill,
        skillNameByCode: analysis.skillNameByCode,
        topN: 5,
      });
      return { className, classStudents, classWeaknesses };
    });

    const totalStudents = students.length;
    const incompleteStudents = students.filter((s) => s.hasIncompleteTask).length;

    const classWeaknessHtml = classBlocks
      .map((block) => {
        const rows =
          block.classWeaknesses.length === 0
            ? `<tr><td colspan="5">目前沒有足夠測驗資料可分析。</td></tr>`
            : block.classWeaknesses
                .map(
                  (w) => `
                  <tr>
                    <td>${escapeHtml(w.skillCode)} ${escapeHtml(w.skillName)}</td>
                    <td>${w.wrongRate}%</td>
                    <td>${w.wrongStudentCount} / ${w.attemptedStudentCount}</td>
                    <td>${w.wrongAnswers} / ${w.totalAnswers}</td>
                    <td>${escapeHtml(w.teacherSuggestion)}</td>
                  </tr>
                `,
                )
                .join("");
        return `
          <h4>${escapeHtml(block.className)} 班</h4>
          <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;margin-bottom:16px">
            <tr>
              <th>弱點觀念</th>
              <th>錯誤率</th>
              <th>答錯人數 / 作答人數</th>
              <th>答錯題數 / 作答題數</th>
              <th>老師教學建議</th>
            </tr>
            ${rows}
          </table>
        `;
      })
      .join("");

    const studentWeaknessHtml = students
      .map((s) => {
        const videoRateText = s.videoCompletionRate === null ? "—" : `${s.videoCompletionRate}%`;
        const quizRateText = s.quizCompletionRate === null ? "—" : `${s.quizCompletionRate}%`;
        const weakList =
          s.weakestSkills.length === 0
            ? "資料不足，建議先完成更多測驗。"
            : s.weakestSkills
                .map((w) => `${w.skillCode} ${w.skillName}（正確率 ${w.accuracy}%）`)
                .join("、");
        return `
          <tr>
            <td>${escapeHtml(s.studentName)}</td>
            <td>${escapeHtml(s.className ?? "未分班")}</td>
            <td>${videoRateText}</td>
            <td>${quizRateText}</td>
            <td>${escapeHtml(weakList)}</td>
            <td>${escapeHtml(s.suggestion)}</td>
          </tr>
        `;
      })
      .join("");

    const incompleteHtml = students
      .filter((s) => s.hasIncompleteTask)
      .map(
        (s) => {
          const videoRateText = s.videoCompletionRate === null ? "—" : `${s.videoCompletionRate}%`;
          const quizRateText = s.quizCompletionRate === null ? "—" : `${s.quizCompletionRate}%`;
          return `<li>${escapeHtml(s.className ?? "未分班")} ${escapeHtml(s.studentName)}：影片 ${videoRateText} / 測驗 ${quizRateText}</li>`;
        },
      )
      .join("");

    const parentSummaryHtml = students
      .slice(0, 10)
      .map((s) => `<li><strong>${escapeHtml(s.studentName)}</strong>：${escapeHtml(this.parentTextSvc.build(s))}</li>`)
      .join("");

    const warningHtml = warnings.length
      ? `<div style="margin-top:12px;color:#9a3412"><strong>系統提醒：</strong><ul>${warnings
          .map((w) => `<li>${escapeHtml(w)}</li>`)
          .join("")}</ul></div>`
      : "";

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111">
        <h2>每日學習報告（${escapeHtml(date)}）</h2>

        <h3>1. 今日總覽</h3>
        <ul>
          <li>班級數：${classBlocks.length}</li>
          <li>學生數：${totalStudents}</li>
          <li>未完成任務學生數：${incompleteStudents}</li>
        </ul>

        <h3>2. 班級整體弱點</h3>
        ${classWeaknessHtml}

        <h3>3. 學生個別弱點</h3>
        <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse">
          <tr>
            <th>學生</th>
            <th>班級</th>
            <th>影片完成率</th>
            <th>測驗完成率</th>
            <th>最弱 3 個 skill</th>
            <th>個別學習建議</th>
          </tr>
          ${studentWeaknessHtml}
        </table>

        <h3>4. 未完成任務提醒</h3>
        ${incompleteHtml ? `<ul>${incompleteHtml}</ul>` : "<p>今日所有可計算任務都已完成。</p>"}

        <h3>5. 家長版摘要</h3>
        <p>以下文字可直接轉貼給家長：</p>
        <ul>${parentSummaryHtml || "<li>目前沒有可產生家長摘要的學生資料。</li>"}</ul>
        ${students.length > 10 ? "<p>（僅顯示前 10 位學生家長摘要，其餘可於系統中個別查看）</p>" : ""}
        ${warningHtml}
      </div>
    `;

    return {
      subject: `每日學習報告（${date}）`,
      html,
      totals: {
        classCount: classBlocks.length,
        studentCount: totalStudents,
        incompleteStudentCount: incompleteStudents,
      },
      warnings,
    };
  }
}
