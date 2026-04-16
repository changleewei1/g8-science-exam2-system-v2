import type { StudentReportDto } from "@/domain/services/student-report-service";

export type LearningPerformancePayload = {
  studentName: string;
  subjectTitle: string;
  weakSkills: { name: string; accuracyPct: number }[];
  quizPassRate: number;
  commentText: string;
};

export function buildLearningPerformancePayload(
  dto: StudentReportDto,
  subjectLabel: string,
): LearningPerformancePayload {
  const s = dto.summary;
  const weak = s.weakSkills.slice(0, 3).map((w) => ({
    name: w.skillName,
    accuracyPct: Math.round(w.accuracy * 100),
  }));
  const commentText =
    s.paragraphs.length > 0 ? s.paragraphs.slice(0, 3).join("\n") : "（暫無評語）";

  return {
    studentName: dto.student.displayName,
    subjectTitle: dto.examScope?.title ?? subjectLabel,
    weakSkills: weak,
    quizPassRate: s.quizPassRate,
    commentText,
  };
}
