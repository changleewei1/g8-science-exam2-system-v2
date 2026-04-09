/** 對應 Supabase 資料列的純型別（snake_case），供 repository 對應用 */

export type StudentRow = {
  id: string;
  student_code: string;
  name: string;
  grade: number;
  class_name: string | null;
  is_active: boolean;
  password_hash: string | null;
  created_at: string;
};

export type ExamScopeRow = {
  id: string;
  subject: string;
  grade: number;
  term: number;
  exam_no: number;
  title: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
};

export type ScopeUnitRow = {
  id: string;
  exam_scope_id: string;
  unit_code: string;
  unit_title: string;
  sort_order: number;
  created_at: string;
};

export type VideoRow = {
  id: string;
  unit_id: string;
  youtube_video_id: string;
  playlist_id: string | null;
  video_order: number | null;
  title: string;
  description: string | null;
  duration_seconds: number | null;
  thumbnail_url: string | null;
  subtitle_text: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type VideoSkillTagRow = {
  id: string;
  video_id: string;
  skill_code: string;
  skill_name: string;
  created_at: string;
};

export type StudentVideoProgressRow = {
  id: string;
  student_id: string;
  video_id: string;
  watch_seconds: string | number;
  last_position_seconds: string | number;
  completion_rate: string | number;
  is_completed: boolean;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  completed_at: string | null;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type QuizRow = {
  id: string;
  video_id: string;
  title: string;
  description: string | null;
  pass_score: number;
  question_count: number;
  is_active: boolean;
  created_at: string;
};

export type QuizQuestionRow = {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
  difficulty: string | null;
  skill_code: string;
  question_image_url?: string | null;
  reference_image_url?: string | null;
  choice_a_image_url?: string | null;
  choice_b_image_url?: string | null;
  choice_c_image_url?: string | null;
  choice_d_image_url?: string | null;
  created_at: string;
};

export type StudentQuizAttemptRow = {
  id: string;
  student_id: string;
  quiz_id: string;
  score: number;
  is_passed: boolean;
  started_at: string | null;
  submitted_at: string | null;
  created_at: string;
};

export type StudentQuizAnswerRow = {
  id: string;
  attempt_id: string;
  question_id: string;
  selected_answer: string;
  is_correct: boolean;
  created_at: string;
};

export type SkillTagRow = {
  code: string;
  name: string;
  unit: string;
  category: string | null;
  difficulty: string | null;
  domain: string | null;
  created_at: string;
};

export type QuestionBankItemRow = {
  id: string;
  unit: string;
  skill_code: string;
  difficulty: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
  source_key: string | null;
  /** migration 20260409120000；未套用前可能為 undefined */
  excluded_from_video_quiz_pool?: boolean;
  created_at: string;
};

export type ReactionRateQuestionCandidateRow = {
  id: string;
  skill_code: string;
  difficulty: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
  source_key: string | null;
  review_status: "pending" | "promoted" | "rejected";
  promoted_bank_item_id: string | null;
  created_at: string;
};

export type VideoQuizMappingRow = {
  video_id: string;
  quiz_id: string;
  created_at: string;
};

export type LearningTaskRow = {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  class_name: string;
  /** migration 20250404120000；未套用前可能為 undefined */
  is_active?: boolean;
  created_at: string;
  updated_at?: string;
};

export type TaskVideoRow = {
  id: string;
  task_id: string;
  video_id: string;
  day_index: number;
  created_at: string;
};

export type StudentTaskProgressRow = {
  id: string;
  student_id: string;
  task_id: string;
  video_id: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentReportTokenRow = {
  id: string;
  student_id: string;
  task_id: string | null;
  token: string;
  expires_at: string | null;
  created_at: string;
};
