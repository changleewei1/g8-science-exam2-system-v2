import {
  Student,
  ExamScope,
  ScopeUnit,
  Video,
  VideoProgress,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  SkillTag,
} from "@/domain/entities";
import type {
  StudentRow,
  ExamScopeRow,
  ScopeUnitRow,
  VideoRow,
  StudentVideoProgressRow,
  QuizRow,
  QuizQuestionRow,
  StudentQuizAttemptRow,
  SkillTagRow,
} from "@/types/database";

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : parseFloat(String(v));
}

export function studentFromRow(r: StudentRow): Student {
  return new Student(
    r.id,
    r.student_code,
    r.name,
    r.grade,
    r.class_name,
    r.is_active,
    r.password_hash ?? null,
    r.created_at ?? null,
  );
}

export function examScopeFromRow(r: ExamScopeRow): ExamScope {
  return new ExamScope(
    r.id,
    r.subject,
    r.grade,
    r.term,
    r.exam_no,
    r.title,
    r.description,
    r.is_active,
  );
}

export function scopeUnitFromRow(r: ScopeUnitRow): ScopeUnit {
  return new ScopeUnit(r.id, r.exam_scope_id, r.unit_code, r.unit_title, r.sort_order);
}

export function videoFromRow(r: VideoRow): Video {
  return new Video(
    r.id,
    r.unit_id,
    r.youtube_video_id,
    r.playlist_id,
    r.video_order,
    r.title,
    r.description,
    r.duration_seconds,
    r.thumbnail_url,
    r.subtitle_text,
    r.sort_order,
    r.is_active,
  );
}

export function videoProgressFromRow(r: StudentVideoProgressRow): VideoProgress {
  return new VideoProgress(
    r.id,
    r.student_id,
    r.video_id,
    num(r.watch_seconds),
    num(r.last_position_seconds),
    num(r.completion_rate),
    r.is_completed,
    r.first_viewed_at ? new Date(r.first_viewed_at) : null,
    r.last_viewed_at ? new Date(r.last_viewed_at) : null,
    r.completed_at ? new Date(r.completed_at) : null,
    r.view_count,
  );
}

export function quizFromRow(r: QuizRow): Quiz {
  return new Quiz(
    r.id,
    r.video_id,
    r.title,
    r.description,
    r.pass_score,
    r.question_count,
    r.is_active,
  );
}

export function quizQuestionFromRow(r: QuizQuestionRow): QuizQuestion {
  return new QuizQuestion(
    r.id,
    r.quiz_id,
    r.question_text,
    r.question_type,
    r.choice_a,
    r.choice_b,
    r.choice_c,
    r.choice_d,
    r.correct_answer,
    r.explanation,
    r.sort_order,
    r.difficulty,
    r.skill_code,
    r.question_image_url ?? null,
    r.reference_image_url ?? null,
    r.choice_a_image_url ?? null,
    r.choice_b_image_url ?? null,
    r.choice_c_image_url ?? null,
    r.choice_d_image_url ?? null,
  );
}

export function quizAttemptFromRow(r: StudentQuizAttemptRow): QuizAttempt {
  return new QuizAttempt(
    r.id,
    r.student_id,
    r.quiz_id,
    r.score,
    r.is_passed,
    r.started_at ? new Date(r.started_at) : null,
    r.submitted_at ? new Date(r.submitted_at) : null,
  );
}

export function skillTagFromRow(r: SkillTagRow): SkillTag {
  return new SkillTag(r.code, r.name, r.unit, r.category, r.difficulty, r.domain ?? null);
}
