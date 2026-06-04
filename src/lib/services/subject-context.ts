/** 跨模組服務共用的最小脈絡（避免寫死單一科目）。 */
export type SubjectServiceContext = {
  subjectKey: string;
  /** 段考範圍 id；可選 */
  examScopeId?: string | null;
};
