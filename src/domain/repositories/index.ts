export type { StudentInsertRow, StudentRepository } from "./student-repository";
export type { ExamScopeRepository } from "./exam-scope-repository";
export type { ScopeUnitRepository } from "./scope-unit-repository";
export type { VideoRepository, VideoInsert } from "./video-repository";
export type { VideoSkillTagRepository, VideoSkillTagInsert } from "./video-skill-tag-repository";
export type {
  VideoProgressRepository,
  VideoProgressUpsert,
} from "./video-progress-repository";
export type { QuizRepository, QuizInsert } from "./quiz-repository";
export type {
  QuizQuestionRepository,
  QuizQuestionInsert,
  QuizQuestionSyncPayload,
} from "./quiz-question-repository";
export type {
  QuizAttemptRepository,
  AttemptInsert,
  AnswerInsert,
  AttemptAnswerRow,
} from "./quiz-attempt-repository";
export type { SkillTagRepository, SkillTagUpsert } from "./skill-tag-repository";
export type {
  LearningTaskRepository,
  LearningTaskInsert,
  TaskVideoInsert,
} from "./learning-task-repository";
export type {
  StudentTaskProgressRepository,
  StudentTaskProgressUpsert,
} from "./student-task-progress-repository";
