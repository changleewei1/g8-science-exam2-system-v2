import type { StudentReportDto } from "@/domain/services/student-report-service";

export type VideoRecommendationItem = {
  title: string;
  reason: string;
};

export type VideoRecommendationPayload = {
  studentName: string;
  subjectTitle: string;
  suggestedVideos: VideoRecommendationItem[];
};

/**
 * 僅使用 DTO 既有欄位；不包含可對外公開之觀看 URL（家長帳號無學生登入時無可靠連結，詳見 flex 說明）。
 */
export function buildVideoRecommendationPayload(
  dto: StudentReportDto,
  subjectLabel: string,
): VideoRecommendationPayload {
  const items: VideoRecommendationItem[] = dto.summary.suggestedVideos.slice(0, 3).map(
    (v) => ({
      title: v.title,
      reason: v.reason,
    }),
  );

  return {
    studentName: dto.student.displayName,
    subjectTitle: dto.examScope?.title ?? subjectLabel,
    suggestedVideos: items,
  };
}
