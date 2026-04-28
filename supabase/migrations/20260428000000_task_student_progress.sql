-- 任務追蹤：彙總快取表（可選）。不修改既有 learning_tasks / student_task_progress 結構。
-- 若未使用此表，系統仍可直接由 student_task_progress + quizzes 統計。

create table if not exists public.task_student_progress (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.learning_tasks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  video_completed_count int not null default 0,
  total_videos int not null default 0,
  quiz_completed_count int not null default 0,
  total_quizzes int not null default 0,
  updated_at timestamptz not null default now(),
  unique(task_id, student_id)
);

create index if not exists idx_tsp_task on public.task_student_progress(task_id);
create index if not exists idx_tsp_student on public.task_student_progress(student_id);

drop trigger if exists trg_task_student_progress_updated on public.task_student_progress;
create trigger trg_task_student_progress_updated
before update on public.task_student_progress
for each row execute function public.set_updated_at();

