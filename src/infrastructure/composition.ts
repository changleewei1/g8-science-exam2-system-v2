import { GetExamScopeUseCase } from "@/domain/usecases/get-exam-scope-use-case";
import { CreateLearningTaskUseCase } from "@/domain/usecases/create-learning-task-use-case";
import { GetAdminLearningTaskDetailUseCase } from "@/domain/usecases/get-admin-learning-task-detail-use-case";
import { GetStudentLearningTasksUseCase } from "@/domain/usecases/get-student-learning-tasks-use-case";
import { ListLearningTasksUseCase } from "@/domain/usecases/list-learning-tasks-use-case";
import { GetAdminTaskProgressDetailUseCase } from "@/domain/usecases/get-admin-task-progress-detail-use-case";
import { GetQuizAttemptDetailUseCase } from "@/domain/usecases/get-quiz-attempt-detail-use-case";
import { GetQuizDetailUseCase } from "@/domain/usecases/get-quiz-detail-use-case";
import { GetQuizByVideoUseCase } from "@/domain/usecases/get-quiz-by-video-use-case";
import { GetStudentDashboardUseCase } from "@/domain/usecases/get-student-dashboard-use-case";
import { GetVideoDetailUseCase } from "@/domain/usecases/get-video-detail-use-case";
import { ListUnitVideosUseCase } from "@/domain/usecases/list-unit-videos-use-case";
import { LoginAdminUseCase } from "@/domain/usecases/login-admin-use-case";
import { LoginStudentUseCase } from "@/domain/usecases/login-student-use-case";
import { SubmitQuizUseCase } from "@/domain/usecases/submit-quiz-use-case";
import { UpdateLearningTaskUseCase } from "@/domain/usecases/update-learning-task-use-case";
import { UpdateVideoProgressUseCase } from "@/domain/usecases/update-video-progress-use-case";
import { AdminDashboardService } from "@/domain/services/admin-dashboard-service";
import { ReportLinkService } from "@/domain/services/report-link-service";
import { StudentReportService } from "@/domain/services/student-report-service";
import { CreateStudentReportLinkUseCase } from "@/domain/usecases/create-student-report-link-use-case";
import { GetAdminStudentReportUseCase } from "@/domain/usecases/get-admin-student-report-use-case";
import { GetPublicReportByTokenUseCase } from "@/domain/usecases/get-public-report-by-token-use-case";
import { PlaylistImportService } from "@/domain/services/playlist-import-service";
import { QuizService } from "@/domain/services/quiz-service";
import { StudentLearningService } from "@/domain/services/student-learning-service";
import { LearningTaskService } from "@/domain/services/learning-task-service";
import { StudentAdminService } from "@/domain/services/student-admin-service";
import { VideoTrackingService } from "@/domain/services/video-tracking-service";
import { SupabaseLearningTaskRepository } from "@/infrastructure/repositories/supabase-learning-task-repository";
import { SupabaseStudentTaskProgressRepository } from "@/infrastructure/repositories/supabase-student-task-progress-repository";
import { SupabaseExamScopeRepository } from "@/infrastructure/repositories/supabase-exam-scope-repository";
import { SupabaseQuizAttemptRepository } from "@/infrastructure/repositories/supabase-quiz-attempt-repository";
import { SupabaseQuizQuestionRepository } from "@/infrastructure/repositories/supabase-quiz-question-repository";
import { SupabaseQuizRepository } from "@/infrastructure/repositories/supabase-quiz-repository";
import { SupabaseScopeUnitRepository } from "@/infrastructure/repositories/supabase-scope-unit-repository";
import { SupabaseSkillTagRepository } from "@/infrastructure/repositories/supabase-skill-tag-repository";
import { SupabaseStudentRepository } from "@/infrastructure/repositories/supabase-student-repository";
import { SupabaseVideoProgressRepository } from "@/infrastructure/repositories/supabase-video-progress-repository";
import { SupabaseVideoRepository } from "@/infrastructure/repositories/supabase-video-repository";
import { SupabaseVideoSkillTagRepository } from "@/infrastructure/repositories/supabase-video-skill-tag-repository";

function repos() {
  return {
    students: new SupabaseStudentRepository(),
    examScopes: new SupabaseExamScopeRepository(),
    scopeUnits: new SupabaseScopeUnitRepository(),
    videos: new SupabaseVideoRepository(),
    videoSkillTags: new SupabaseVideoSkillTagRepository(),
    videoProgress: new SupabaseVideoProgressRepository(),
    quizzes: new SupabaseQuizRepository(),
    quizQuestions: new SupabaseQuizQuestionRepository(),
    quizAttempts: new SupabaseQuizAttemptRepository(),
    skillTags: new SupabaseSkillTagRepository(),
    learningTasks: new SupabaseLearningTaskRepository(),
    studentTaskProgress: new SupabaseStudentTaskProgressRepository(),
  };
}

export function getLearningTaskService() {
  const r = repos();
  return new LearningTaskService(
    r.learningTasks,
    r.studentTaskProgress,
    r.students,
    r.videos,
  );
}

export function getVideoTrackingService() {
  const r = repos();
  return new VideoTrackingService(r.videoProgress, r.videos, getLearningTaskService());
}

export function getQuizService() {
  const r = repos();
  return new QuizService(r.quizzes, r.quizQuestions, r.videoProgress, r.quizAttempts);
}

export function getStudentLearningService() {
  return new StudentLearningService();
}

export function getAdminDashboardService() {
  return new AdminDashboardService();
}

export function getStudentAdminService() {
  const r = repos();
  return new StudentAdminService(r.students);
}

export function getStudentReportService() {
  return new StudentReportService();
}

export function getReportLinkService() {
  return new ReportLinkService();
}

export function getAdminStudentReportUseCase() {
  return new GetAdminStudentReportUseCase(getStudentReportService());
}

export function getPublicReportByTokenUseCase() {
  return new GetPublicReportByTokenUseCase(getReportLinkService(), getStudentReportService());
}

export function getCreateStudentReportLinkUseCase() {
  return new CreateStudentReportLinkUseCase(getReportLinkService());
}

export function getPlaylistImportService() {
  const r = repos();
  return new PlaylistImportService(r.videos, r.videoSkillTags, r.quizzes, r.quizQuestions);
}

export function getRepositories() {
  return repos();
}

export function getLoginStudentUseCase() {
  const r = repos();
  return new LoginStudentUseCase(r.students);
}

export function getLoginAdminUseCase() {
  return new LoginAdminUseCase();
}

export function getExamScopeUseCase() {
  const r = repos();
  return new GetExamScopeUseCase(r.examScopes, r.scopeUnits);
}

export function getListUnitVideosUseCase() {
  const r = repos();
  return new ListUnitVideosUseCase(r.videos, r.videoProgress, r.quizzes, r.quizAttempts);
}

export function getVideoDetailUseCase() {
  const r = repos();
  return new GetVideoDetailUseCase(r.videos, r.videoProgress, r.quizzes);
}

export function getUpdateVideoProgressUseCase() {
  return new UpdateVideoProgressUseCase(getVideoTrackingService());
}

export function getQuizByVideoUseCase() {
  return new GetQuizByVideoUseCase(getQuizService());
}

export function getQuizDetailUseCase() {
  return new GetQuizDetailUseCase(getQuizService());
}

export function getSubmitQuizUseCase() {
  return new SubmitQuizUseCase(getQuizService());
}

export function getStudentDashboardUseCase() {
  const r = repos();
  return new GetStudentDashboardUseCase(r.examScopes, r.scopeUnits, getStudentLearningService());
}

export function getQuizAttemptDetailUseCase() {
  const r = repos();
  return new GetQuizAttemptDetailUseCase(r.quizAttempts, r.quizzes, r.quizQuestions, r.videos);
}

export function getCreateLearningTaskUseCase() {
  return new CreateLearningTaskUseCase(getLearningTaskService());
}

export function getUpdateLearningTaskUseCase() {
  return new UpdateLearningTaskUseCase(getLearningTaskService());
}

export function getListLearningTasksUseCase() {
  return new ListLearningTasksUseCase(getLearningTaskService());
}

export function getAdminLearningTaskDetailUseCase() {
  return new GetAdminLearningTaskDetailUseCase(getLearningTaskService());
}

export function getAdminTaskProgressDetailUseCase() {
  return new GetAdminTaskProgressDetailUseCase(getLearningTaskService());
}

export function getStudentLearningTasksUseCase() {
  return new GetStudentLearningTasksUseCase(getLearningTaskService());
}
