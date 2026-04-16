import type { StudentReportDto } from "@/domain/services/student-report-service";

import { isUsableLineFlexUri } from "@/lib/line/is-usable-line-flex-uri";
import type { LineMessage } from "@/lib/line/reply-message";

/**
 * 將 `StudentReportDto`（audience: parent）轉為 LINE Flex Bubble（不重改 StudentReportService）。
 */
export function buildParentReportFlex(input: {
  dto: StudentReportDto;
  /** 完整報告頁（含 token），例如 `/report?t=…` */
  fullReportUrl: string;
}): LineMessage {
  const { dto, fullReportUrl } = input;
  const s = dto.student;
  const exam = dto.examScope?.title ?? "—";
  const task = dto.task?.title ?? "—";
  const sum = dto.summary;
  const weak =
    sum.weakSkills.length > 0
      ? sum.weakSkills
          .slice(0, 3)
          .map((w) => `${w.skillName}（${Math.round(w.accuracy * 100)}%）`)
          .join("、")
      : "—";
  const para =
    sum.paragraphs.length > 0
      ? sum.paragraphs.slice(0, 2).join("\n")
      : "（暫無摘要）";

  const alt = `${s.displayName} 學習狀況`;

  const canLink = isUsableLineFlexUri(fullReportUrl);

  const bodyContents: Record<string, unknown>[] = [
    {
      type: "box",
      layout: "baseline",
      contents: [
        { type: "text", text: "段考範圍", flex: 2, size: "sm", color: "#888888" },
        { type: "text", text: exam, flex: 5, size: "sm", wrap: true },
      ],
    },
    {
      type: "box",
      layout: "baseline",
      contents: [
        { type: "text", text: "任務", flex: 2, size: "sm", color: "#888888" },
        { type: "text", text: task, flex: 5, size: "sm", wrap: true },
      ],
    },
    {
      type: "separator",
      margin: "md",
    },
    {
      type: "text",
      text: `影片完成 ${sum.completedVideos}/${sum.totalVideos} · 測驗通過率 ${Math.round(sum.quizPassRate * 100)}%`,
      size: "sm",
      wrap: true,
    },
    {
      type: "text",
      text: `待加強：${weak}`,
      size: "sm",
      wrap: true,
      margin: "md",
    },
    {
      type: "text",
      text: para,
      size: "sm",
      wrap: true,
      margin: "md",
    },
  ];

  if (!canLink) {
    bodyContents.push({
      type: "text",
      text:
        "（完整報告連結需使用 https 公開網址；本機請在 .env 設定 APP_BASE_URL 為 ngrok 的 https 網址）",
      size: "xs",
      color: "#888888",
      wrap: true,
      margin: "md",
    });
  }

  return {
    type: "flex",
    altText: alt.slice(0, 400),
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "學習狀況摘要",
            weight: "bold",
            size: "lg",
            color: "#ffffff",
          },
          {
            type: "text",
            text: `${s.displayName}${s.className ? ` · ${s.className}` : ""}`,
            size: "sm",
            color: "#ffffff",
            margin: "md",
          },
        ],
        backgroundColor: "#1DB446",
        paddingAll: "18px",
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: bodyContents,
        paddingAll: "16px",
      },
      ...(canLink
        ? {
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "sm",
                  action: {
                    type: "uri",
                    label: "開啟完整報告",
                    uri: fullReportUrl,
                  },
                },
              ],
              paddingAll: "12px",
            },
          }
        : {}),
    },
  };
}
