import type { StudentDigestRow } from "@/domain/services/student-weakness-analysis-service";

export class ParentDigestTextService {
  build(student: StudentDigestRow): string {
    const todayDone =
      student.videoCompletionRate >= 100 && student.quizCompletionRate >= 100
        ? "孩子今天已完成老師安排的學習任務。"
        : "孩子今天的學習任務尚未完全完成。";

    const weakPart =
      student.weakestSkills.length === 0
        ? "目前測驗資料還不夠，建議先完成更多練習題，再觀察較需要加強的觀念。"
        : `目前較需要加強的觀念包含：${student.weakestSkills
            .map((w) => `「${w.skillName}」這類題型`)
            .join("、")}，孩子在這些題型較容易出錯。`;

    const remindPart =
      student.videoCompletionRate >= 100 && student.quizCompletionRate >= 100
        ? "建議家長提醒孩子做 10-15 分鐘重點複習，鞏固今天學到的內容。"
        : "建議家長提醒孩子先補齊未完成影片與小測，再針對錯題重新練習。";

    return `${todayDone}${weakPart}${remindPart}`;
  }
}
