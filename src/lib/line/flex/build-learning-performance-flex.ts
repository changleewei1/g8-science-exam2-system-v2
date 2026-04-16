import type { LearningPerformancePayload } from "@/lib/line/adapters/build-learning-performance-data";
import type { LineMessage } from "@/lib/line/reply-message";

export function buildLearningPerformanceFlex(
  p: LearningPerformancePayload,
): LineMessage {
  const weakText =
    p.weakSkills.length > 0
      ? p.weakSkills.map((w) => `${w.name}（正確率約 ${w.accuracyPct}%）`).join("\n")
      : "（暫無弱點資料）";
  const rate = `${Math.round(p.quizPassRate * 100)}%`;

  return {
    type: "flex",
    altText: `${p.studentName} ${p.subjectTitle} 學習表現`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: `${p.studentName} · ${p.subjectTitle}`,
            weight: "bold",
            size: "lg",
            wrap: true,
          },
          {
            type: "text",
            text: `測驗通過率：${rate}`,
            size: "sm",
            wrap: true,
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "弱點 Top 3",
            weight: "bold",
            size: "sm",
          },
          {
            type: "text",
            text: weakText,
            size: "sm",
            wrap: true,
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: p.commentText,
            size: "sm",
            wrap: true,
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}
