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

export type StudentDashboardPayload = {
  studentName: string;
  summary: DashboardSummary;
  hero: DashboardHeroStats;
  grades: GradeDashboardBlock[];
};
