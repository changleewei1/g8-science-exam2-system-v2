/**
 * 題目品質：與 question_feedback、question_quality_stats、update_question_quality_score 對齊。
 * 分數規則以資料庫函式為準；此處僅供文件化與前端說明用常數。
 */
export const QUESTION_QUALITY_FEEDBACK_WEIGHTS = {
  helpful: 2,
  not_related: -20,
  confusing: -10,
  wrong_answer: -30,
  bad_explanation: -15,
} as const;

export type QuestionQualityFeedbackType = keyof typeof QUESTION_QUALITY_FEEDBACK_WEIGHTS;

/** 與 DB check 一致 */
export const QUESTION_QUALITY_REVIEW_STATUSES = ["normal", "needs_review", "hidden", "approved"] as const;
