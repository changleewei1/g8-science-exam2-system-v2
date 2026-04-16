import type { VideoRecommendationPayload } from "@/lib/line/adapters/build-video-recommendation-data";
import type { LineMessage } from "@/lib/line/reply-message";

/**
 * MVP：不附「立即觀看」按鈕；`/student/video/[videoId]` 需學生登入，家長無可靠公開網址。
 * 改以標題＋理由文字呈現；TODO：未來若有家長可開之補強連結再改為 uri 按鈕。
 */
export function buildVideoRecommendationFlex(
  p: VideoRecommendationPayload,
): LineMessage {
  const items = p.suggestedVideos.map((v, i) => ({
    type: "box" as const,
    layout: "vertical" as const,
    spacing: "sm" as const,
    margin: "lg" as const,
    contents: [
      {
        type: "text" as const,
        text: `${i + 1}. ${v.title}`,
        weight: "bold" as const,
        size: "sm" as const,
        wrap: true,
      },
      {
        type: "text" as const,
        text: v.reason,
        size: "xs" as const,
        wrap: true,
        color: "#666666",
      },
    ],
  }));

  return {
    type: "flex",
    altText: `${p.studentName} 推薦影片`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
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
            text: "補強影片建議",
            size: "sm",
            margin: "md",
          },
          ...items,
          {
            type: "text",
            text: "請由學生使用學校帳號登入課程頁面觀看影片。",
            size: "xs",
            color: "#888888",
            wrap: true,
            margin: "lg",
          },
        ],
        paddingAll: "16px",
      },
    },
  };
}
