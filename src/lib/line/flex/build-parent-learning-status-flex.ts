import type { LineMessage } from "@/lib/line/reply-message";
import { isUsableLineFlexUri } from "@/lib/line/is-usable-line-flex-uri";

import {
  formatPercent,
  learningJudgmentFromVideoCompletionRatio,
} from "@/lib/line/flex/format-percent";

export type ParentLearningStatusFlexPayload = {
  studentName: string;
  /** 顯示用班級，例如「702班」 */
  classLabel: string;
  /** 科目名稱 */
  subjectTitle: string;
  /** 段考範圍說明 */
  examScopeLabel: string;
  /** 任務／學習計畫名稱 */
  taskName: string;
  /** 影片完成率 0–1 */
  videoCompletionRate: number;
  /** 測驗通過率 0–1 */
  quizPassRate: number;
  /** 弱點名稱，最多 3 個 */
  weaknesses: string[];
  /** 一句建議 */
  suggestion: string;
  /** 「查看完整報告」按鈕連結（需 https） */
  fullReportUrl?: string;
  /** 「補強學習影片」按鈕連結（需 https） */
  supplementVideosUrl?: string;
};

type FlexBox = Record<string, unknown>;
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

function bodyText(text: string, size: "xs" | "sm" = "sm"): FlexComponent {
  return {
    type: "text",
    text,
    size,
    wrap: true,
    color: "#333333",
  };
}

/** 家長版：學習狀況摘要 Flex（bubble） */
export function buildParentLearningStatusFlex(
  p: ParentLearningStatusFlexPayload,
): LineMessage {
  const weaknesses = (p.weaknesses ?? []).slice(0, 3);
  const weakLines =
    weaknesses.length > 0
      ? weaknesses.map((w, i) => `· ${w}`).join("\n")
      : "· （暫無弱點資料）";

  const videoPct = formatPercent(p.videoCompletionRate, { isRatio: true });
  const quizPct = formatPercent(p.quizPassRate, { isRatio: true });
  const judgment = learningJudgmentFromVideoCompletionRatio(
    p.videoCompletionRate,
  );

  const coreRows: FlexBox[] = [
    {
      type: "box",
      layout: "horizontal",
      spacing: "lg",
      contents: [
        {
          type: "box",
          layout: "vertical",
          flex: 1,
          contents: [
            bodyText("影片完成率", "xs"),
            {
              type: "text",
              text: videoPct,
              size: "xl",
              weight: "bold",
              color: "#0275D8",
            },
          ],
        },
        {
          type: "separator",
          color: "#E0E0E0",
        },
        {
          type: "box",
          layout: "vertical",
          flex: 1,
          contents: [
            bodyText("測驗通過率", "xs"),
            {
              type: "text",
              text: quizPct,
              size: "xl",
              weight: "bold",
              color: "#5C6BC0",
            },
          ],
        },
      ],
    },
  ];

  const bodyContents: FlexComponent[] = [
    {
      type: "text",
      text: "學習狀況摘要",
      weight: "bold",
      size: "xl",
      wrap: true,
    },
    bodyText(`👤 ${p.studentName}　📘 ${p.classLabel}`, "sm"),
    { type: "separator", margin: "md" },
    sectionTitle("📊", "科目與範圍"),
    bodyText(`${p.subjectTitle}｜${p.examScopeLabel}`),
    { type: "separator", margin: "md" },
    sectionTitle("📋", "任務"),
    bodyText(p.taskName),
    { type: "separator", margin: "md" },
    sectionTitle("📈", "核心數據"),
    ...coreRows,
    { type: "separator", margin: "md" },
    sectionTitle("🎯", "學習判斷"),
    bodyText(judgment, "sm"),
    { type: "separator", margin: "md" },
    sectionTitle("⚠️", "弱點（最多 3 項）"),
    { type: "text", text: weakLines, size: "sm", wrap: true, color: "#555555" },
    { type: "separator", margin: "md" },
    sectionTitle("💡", "建議"),
    bodyText(p.suggestion),
  ];

  const footerButtons: FlexComponent[] = [];
  if (p.fullReportUrl && isUsableLineFlexUri(p.fullReportUrl)) {
    footerButtons.push({
      type: "button",
      style: "primary",
      color: "#0275D8",
      height: "sm",
      action: {
        type: "uri",
        label: "查看完整報告",
        uri: p.fullReportUrl,
      },
    });
  }
  if (p.supplementVideosUrl && isUsableLineFlexUri(p.supplementVideosUrl)) {
    footerButtons.push({
      type: "button",
      style: "secondary",
      height: "sm",
      action: {
        type: "uri",
        label: "補強學習影片",
        uri: p.supplementVideosUrl,
      },
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
    altText: `${p.studentName} 學習狀況摘要（${judgment}）`,
    contents: bubble,
  };
}
