import type { LineMessage } from "@/lib/line/reply-message";
import { isUsableLineFlexUri } from "@/lib/line/is-usable-line-flex-uri";

import { formatPercent } from "@/lib/line/flex/format-percent";

export type ParentHomeworkFlexPayload = {
  studentName: string;
  classLabel: string;
  subjectTitle: string;
  /** 今日完成數量 */
  completedToday: number;
  /** 今日作業總數 */
  totalToday: number;
  /** 完成率 0–1 */
  completionRate: number;
  /** 未完成項目，最多 3 則 */
  incompleteItems: string[];
  suggestion: string;
  /** 「查看詳細作業」 */
  detailUrl?: string;
  /** 「開始補強學習」 */
  strengthenUrl?: string;
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

/** 家長版：回家功課完成狀況 Flex（bubble） */
export function buildParentHomeworkFlex(
  p: ParentHomeworkFlexPayload,
): LineMessage {
  const incomplete = (p.incompleteItems ?? []).slice(0, 3);
  const incText =
    incomplete.length > 0
      ? incomplete.map((s, i) => `${i + 1}. ${s}`).join("\n")
      : "（今日皆已完成）";

  const rateText = formatPercent(p.completionRate, { isRatio: true });
  const xy = `${Math.min(p.completedToday, p.totalToday)}/${Math.max(0, p.totalToday)}`;

  const bodyContents: FlexComponent[] = [
    {
      type: "text",
      text: "回家功課完成狀況",
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
    { type: "text", text: p.subjectTitle, size: "md", wrap: true, weight: "bold" },
    { type: "separator", margin: "md" },
    sectionTitle("📝", "今日作業"),
    {
      type: "text",
      text: `完成 ${xy} 題（項）`,
      size: "lg",
      weight: "bold",
      wrap: true,
    },
    {
      type: "text",
      text: `完成率　${rateText}`,
      size: "xl",
      weight: "bold",
      color: "#F57C00",
      wrap: true,
    },
    { type: "separator", margin: "md" },
    sectionTitle("⏳", "未完成（最多顯示 3 項）"),
    {
      type: "text",
      text: incText,
      size: "sm",
      wrap: true,
      color: "#555555",
    },
    { type: "separator", margin: "md" },
    sectionTitle("💡", "建議"),
    { type: "text", text: p.suggestion, size: "sm", wrap: true },
  ];

  const footerButtons: FlexComponent[] = [];
  if (p.detailUrl && isUsableLineFlexUri(p.detailUrl)) {
    footerButtons.push({
      type: "button",
      style: "primary",
      color: "#0275D8",
      height: "sm",
      action: { type: "uri", label: "查看詳細作業", uri: p.detailUrl },
    });
  }
  if (p.strengthenUrl && isUsableLineFlexUri(p.strengthenUrl)) {
    footerButtons.push({
      type: "button",
      style: "secondary",
      height: "sm",
      action: { type: "uri", label: "開始補強學習", uri: p.strengthenUrl },
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
    altText: `${p.studentName} 回家功課 ${xy} 完成率 ${rateText}`,
    contents: bubble,
  };
}
