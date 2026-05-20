export type SemesterLabel = "上學期" | "下學期";

export type ExamCard = {
  id: string;
  grade: string;
  semester: SemesterLabel;
  exam: string;
  subject: string;
  isOpen: boolean;
  completionRate: number;
  masteredSkills: number;
  totalSkills: number;
  averageMastery: number;
  units: string[];
};

export type DashboardSummary = {
  openScopeCount: number;
  masteredSkills: number;
  averageMastery: number;
  weeklyLearningLabel: string;
};

export type DashboardHeroStats = {
  overallCompletion: number;
  masteredSkills: number;
  totalSkills: number;
  weeklyLearningLabel: string;
  recommendedScopeTitle: string | null;
  recommendedScopeId: string | null;
};

export type GradeDashboardBlock = {
  gradeLabel: string;
  gradeNumber: number;
  fall: ExamCard[];
  spring: ExamCard[];
};

/** 下學期第二／三次段考切換（僅開放中的範圍） */
export type StudentOverviewScopeOption = {
  id: string;
  label: string;
};

export type StudentDashboardPayload = {
  studentName: string;
  summary: DashboardSummary;
  hero: DashboardHeroStats;
  grades: GradeDashboardBlock[];
  /** 個人總覽用：國二／國三對應年級之下學期第 2、3 次段考 */
  overviewScopeOptions: StudentOverviewScopeOption[];
  /** 個人總覽預設段考 scopeId */
  defaultOverviewScopeId: string | null;
};
