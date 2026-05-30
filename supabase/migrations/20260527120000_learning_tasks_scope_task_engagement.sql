-- 學習任務：綁定段考範圍（篩選影片）；任務層級「已開啟」追蹤（學生點進任務列表）
-- 若從未套用 20260428000000_task_student_progress.sql，此檔會一併建立 task_student_progress。

alter table public.learning_tasks
  add column if not exists exam_scope_id uuid references public.exam_scopes (id) on delete set null;

create index if not exists idx_learning_tasks_exam_scope on public.learning_tasks (exam_scope_id);

create table if not exists public.task_student_progress (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.learning_tasks (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  video_completed_count int not null default 0,
  total_videos int not null default 0,
  quiz_completed_count int not null default 0,
  total_quizzes int not null default 0,
  updated_at timestamptz not null default now(),
  opened_at timestamptz,
  first_seen_at timestamptz,
  unique (task_id, student_id)
);

create index if not exists idx_tsp_task on public.task_student_progress (task_id);
create index if not exists idx_tsp_student on public.task_student_progress (student_id);

-- 已由舊 migration 建立、但尚無此二欄者
alter table public.task_student_progress
  add column if not exists opened_at timestamptz,
  add column if not exists first_seen_at timestamptz;

comment on column public.task_student_progress.opened_at is '學生曾進入學習任務頁並標記已讀（任務層級）';
comment on column public.task_student_progress.first_seen_at is '首次標記已讀時間';

drop trigger if exists trg_task_student_progress_updated on public.task_student_progress;
create trigger trg_task_student_progress_updated
before update on public.task_student_progress
for each row execute function public.set_updated_at();
