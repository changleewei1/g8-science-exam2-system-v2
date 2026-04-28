/**
 * 供本機／單元測試或 Simulator 貼上之 mock；按鈕 URL 使用可通過 isUsableLineFlexUri 之 https。
 */
import { buildParentHomeworkFlex } from "@/lib/line/flex/build-parent-homework-flex";
import { buildParentLearningStatusFlex } from "@/lib/line/flex/build-parent-learning-status-flex";
import { buildParentVideoRecommendFlex } from "@/lib/line/flex/build-parent-video-recommend-flex";

const DEMO_BASE = "https://line.me"; // 佔位，僅示意 Flex 按鈕可點

export const mockParentLearningStatusPayload = {
  studentName: "王小明",
  classLabel: "702班",
  subjectTitle: "理化",
  examScopeLabel: "段考範圍：第三冊 Ch.1–Ch.3",
  taskName: "段考複習任務（單元測驗＋補強影片）",
  videoCompletionRate: 0.415,
  quizPassRate: 0.728,
  weaknesses: ["牛頓運動定律（圖像理解）", "力矩與平衡", "壓力與浮力觀念辨析"],
  suggestion:
    "影片進度略低於測驗表現，建議先看「補強段」再把錯題訂正，可更快補齊缺口。",
  fullReportUrl: `${DEMO_BASE}/`,
  supplementVideosUrl: `${DEMO_BASE}/`,
};

export const mockParentHomeworkPayload = {
  studentName: "王小明",
  classLabel: "702班",
  subjectTitle: "理化",
  completedToday: 3,
  totalToday: 7,
  completionRate: 0.4286,
  incompleteItems: [
    "第三章力矩練習（共 4 題）",
    "補強影片筆記上傳",
    "線上小測驗—單元三",
  ],
  suggestion: "優先完成「第三章力矩練習」，再銜接補強影片較省力。",
  detailUrl: `${DEMO_BASE}/`,
  strengthenUrl: `${DEMO_BASE}/`,
};

export const mockParentVideoRecommendPayload = {
  studentName: "王小明",
  classLabel: "702班",
  subjectTitle: "理化",
  recommendReason:
    "依測驗錯題與技能雷達，牛頓運動定律與受力分析錯誤率較高，下列影片可優先補強。",
  videos: [
    {
      title: "牛頓三大定律—圖像我會看（12 分鐘）",
      weaknessLabel: "牛頓運動定律（圖像理解）",
    },
    {
      title: "受力分析與力圖：斜面與繩張力",
      weaknessLabel: "受力分析步驟",
    },
    {
      title: "力矩與槓桿：生活題拆解",
      weaknessLabel: "力矩與平衡",
    },
  ],
  suggestion: "每天觀看 1 支並完成隨堂小測，一週內通常可明顯改善錯題型態。",
  moreUrl: `${DEMO_BASE}/`,
};

export const mockParentLearningStatusFlex = buildParentLearningStatusFlex(
  mockParentLearningStatusPayload,
);

export const mockParentHomeworkFlex = buildParentHomeworkFlex(
  mockParentHomeworkPayload,
);

export const mockParentVideoRecommendFlex = buildParentVideoRecommendFlex(
  mockParentVideoRecommendPayload,
);
