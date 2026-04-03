-- 國二理化第二次段考：影片觀看＋AI學習診斷 — 初始 schema

create extension if not exists "pgcrypto";

-- 1. students
create table public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique,
  name text not null,
  grade int not null,
  class_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. exam_scopes
create table public.exam_scopes (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  grade int not null,
  term int not null,
  exam_no int not null,
  title text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 3. scope_units
create table public.scope_units (
  id uuid primary key default gen_random_uuid(),
  exam_scope_id uuid not null references public.exam_scopes(id) on delete cascade,
  unit_code text not null,
  unit_title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_scope_units_exam_scope on public.scope_units(exam_scope_id);

-- 4. videos
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.scope_units(id) on delete cascade,
  youtube_video_id text not null,
  playlist_id text,
  video_order int,
  title text not null,
  description text,
  duration_seconds int,
  thumbnail_url text,
  subtitle_text text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_videos_unit on public.videos(unit_id);

-- 5. video_skill_tags
create table public.video_skill_tags (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  skill_code text not null,
  skill_name text not null,
  created_at timestamptz not null default now()
);

create index idx_video_skill_tags_video on public.video_skill_tags(video_id);

-- 6. student_video_progress
create table public.student_video_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  watch_seconds numeric not null default 0,
  last_position_seconds numeric not null default 0,
  completion_rate numeric not null default 0,
  is_completed boolean not null default false,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  completed_at timestamptz,
  view_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, video_id)
);

create index idx_svp_student on public.student_video_progress(student_id);
create index idx_svp_video on public.student_video_progress(video_id);

-- 7. quizzes
create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  title text not null,
  description text,
  pass_score int not null default 2,
  question_count int not null default 3,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(video_id)
);

-- 8. quiz_questions
create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question_text text not null,
  question_type text not null default 'mcq',
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_answer text not null,
  explanation text,
  sort_order int not null default 0,
  difficulty text,
  skill_code text not null,
  created_at timestamptz not null default now()
);

create index idx_quiz_questions_quiz on public.quiz_questions(quiz_id);

-- 9. student_quiz_attempts
create table public.student_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  score int not null default 0,
  is_passed boolean not null default false,
  started_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_sqa_student on public.student_quiz_attempts(student_id);
create index idx_sqa_quiz on public.student_quiz_attempts(quiz_id);

-- 10. student_quiz_answers
create table public.student_quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.student_quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_answer text not null,
  is_correct boolean not null,
  created_at timestamptz not null default now(),
  unique(attempt_id, question_id)
);

-- 11. skill_tags
create table public.skill_tags (
  code text primary key,
  name text not null,
  unit text not null,
  category text,
  difficulty text,
  created_at timestamptz not null default now()
);

-- updated_at trigger for student_video_progress
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_svp_updated
before update on public.student_video_progress
for each row execute function public.set_updated_at();
