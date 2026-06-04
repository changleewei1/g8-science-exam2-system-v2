/**
 * 科目／年級模組設定：新功能請優先讀取此設定，避免在 UI 與 API 寫死「國二理化」。
 * 路由全面改為 /student/[subjectKey]/... 可日後漸進遷移。
 */

export type SubjectModuleFlags = {
  videoLearning: boolean;
  skillTree: boolean;
  adaptivePractice: boolean;
  questionGeneration: boolean;
  learningTasks: boolean;
  reporting: boolean;
};

export type SubjectConfig = {
  subjectKey: string;
  displayName: string;
  grade: string;
  subject: string;
  defaultExamScopeTitle: string;
  skillCodePrefix: string[];
  enabledModules: SubjectModuleFlags;
};

export const SUBJECT_CONFIGS: Record<string, SubjectConfig> = {
  g8_science: {
    subjectKey: "g8_science",
    displayName: "國二理化",
    grade: "國二",
    subject: "理化",
    defaultExamScopeTitle: "國二理化下學期第三次段考",
    skillCodePrefix: ["C2", "P2"],
    enabledModules: {
      videoLearning: true,
      skillTree: true,
      adaptivePractice: true,
      questionGeneration: true,
      learningTasks: true,
      reporting: true,
    },
  },
  // 範例：未來啟用時補齊資料來源與路由
  g7_math: {
    subjectKey: "g7_math",
    displayName: "國一數學",
    grade: "國一",
    subject: "數學",
    defaultExamScopeTitle: "國一數學段考",
    skillCodePrefix: ["M7"],
    enabledModules: {
      videoLearning: true,
      skillTree: true,
      adaptivePractice: true,
      questionGeneration: true,
      learningTasks: true,
      reporting: true,
    },
  },
};

export const DEFAULT_SUBJECT_KEY = "g8_science";

export function getSubjectConfig(subjectKey?: string | null): SubjectConfig {
  const key = subjectKey?.trim() || DEFAULT_SUBJECT_KEY;
  return SUBJECT_CONFIGS[key] ?? SUBJECT_CONFIGS[DEFAULT_SUBJECT_KEY];
}
