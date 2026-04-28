import type { LineMessage } from "@/lib/line/reply-message";
import { isUsableLineFlexUri } from "@/lib/line/is-usable-line-flex-uri";

export type ParentVideoRecommendItem = {
  title: string;
  /** 對應弱點／補強焦點 */
  weaknessLabel: string;
};

export type ParentVideoRecommendFlexPayload = {
  studentName: string;
  classLabel: string;
  subjectTitle: string;
  /** 整體推薦原因（呼應弱點） */
  recommendReason: string;
  /** 最多 3 筆 */
  videos: ParentVideoRecommendItem[];
  suggestion: string;
  /** 「查看更多推薦」 */
  moreUrl?: string;
};

type FlexComponent = Record<string, unknown>;

function sectionTitle(icon: string, title: string): FlexComponent {
  return {
    type: "text",
    text: `${icon} ${title}`,
    weight: "bold",
    size: "sm",
    color: "#1DB446",
    margin: "md",
  };
}

/** 家長版：AI 學習推薦（影片）Flex（bubble） */
export function buildParentVideoRecommendFlex(
  p: ParentVideoRecommendFlexPayload,
): LineMessage {
  const videos = (p.videos ?? []).slice(0, 3);
  const videoBlocks: FlexComponent[] = [];
  for (let i = 0; i < videos.length; i++) {
    const v = videos[i];
    videoBlocks.push({
      type: "box",
      layout: "vertical",
      spacing: "xs",
      margin: "lg",
      contents: [
        {
          type: "text",
          text: `🎬 ${i + 1}. ${v.title}`,
          weight: "bold",
          size: "sm",
          wrap: true,
        },
        {
          type: "text",
          text: `對應弱點：${v.weaknessLabel}`,
          size: "xs",
          wrap: true,
          color: "#666666",
        },
      ],
    });
  }

  const bodyContents: FlexComponent[] = [
    {
      type: "text",
      text: "AI 學習推薦",
      weight: "bold",
      size: "xl",
      wrap: true,
    },
    {
      type: "text",
      text: `👤 ${p.studentName}　📘 ${p.classLabel}`,
      size: "sm",
      wrap: true,
    },
    { type: "separator", margin: "md" },
    sectionTitle("📗", "科目"),
    { type: "text", text: p.subjectTitle, size: "md", weight: "bold", wrap: true },
    { type: "separator", margin: "md" },
    sectionTitle("🧠", "推薦原因"),
    {
      type: "text",
      text: p.recommendReason,
      size: "sm",
      wrap: true,
      color: "#333333",
    },
    ...videoBlocks,
    { type: "separator", margin: "md" },
    sectionTitle("💡", "建議"),
    { type: "text", text: p.suggestion, size: "sm", wrap: true },
  ];

  const footerButtons: FlexComponent[] = [];
  if (p.moreUrl && isUsableLineFlexUri(p.moreUrl)) {
    footerButtons.push({
      type: "button",
      style: "primary",
      color: "#1DB446",
      height: "sm",
      action: { type: "uri", label: "查看更多推薦", uri: p.moreUrl },
    });
  }

  const bubble: Record<string, unknown> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: bodyContents,
      paddingAll: "16px",
    },
  };

  if (footerButtons.length > 0) {
    bubble.footer = {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: footerButtons,
      paddingAll: "12px",
    };
  }

  return {
    type: "flex",
    altText: `${p.studentName} AI 學習推薦`,
    contents: bubble,
  };
}
