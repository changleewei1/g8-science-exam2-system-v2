import type { StudentReportDto } from "@/domain/services/student-report-service";

export type HomeworkStatusPayload = {
  studentName: string;
  subjectTitle: string;
  completedVideos: number;
  totalVideos: number;
  videoCompletionRate: number;
  passedQuizzes: number;
  totalQuizzes: number;
  quizPassRate: number;
  taskLine: string | null;
  summaryText: string;
};

export function buildHomeworkStatusPayload(
  dto: StudentReportDto,
  subjectLabel: string,
): HomeworkStatusPayload {
  const s = dto.summary;
  const t = dto.task;

  const taskLine = t
    ? `任務：${t.title}（${t.startDate}～${t.endDate}）`
    : null;

  const summaryText =
    s.paragraphs.length > 0
      ? s.paragraphs.slice(0, 2).join("\n")
      : "（暫無摘要）";

  return {
    studentName: dto.student.displayName,
    subjectTitle: dto.examScope?.title ?? subjectLabel,
    completedVideos: s.completedVideos,
    totalVideos: s.totalVideos,
    videoCompletionRate: s.videoCompletionRate,
    passedQuizzes: s.passedQuizzes,
    totalQuizzes: s.totalQuizzes,
    quizPassRate: s.quizPassRate,
    taskLine,
    summaryText,
  };
}

export function formatHomeworkStatusText(p: HomeworkStatusPayload): string {
  const rateV = `${Math.round(p.videoCompletionRate * 100)}%`;
  const rateQ = `${Math.round(p.quizPassRate * 100)}%`;
  const lines = [
    `【回家功課／完成度】`,
    `學生：${p.studentName}`,
    `科目：${p.subjectTitle}`,
    `影片：${p.completedVideos}／${p.totalVideos}（完成率 ${rateV}）`,
    `測驗通過：${p.passedQuizzes}／${p.totalQuizzes}（通過率 ${rateQ}）`,
  ];
  if (p.taskLine) lines.push(p.taskLine);
  lines.push(`說明：${p.summaryText}`);
  return lines.join("\n");
}
