-- 學習任務：啟用旗標、更新時間、指定學生名單（與整班並存：有名單時以名單為準）

alter table public.learning_tasks
  add column if not exists is_active boolean not null default true;

alter table public.learning_tasks
  add column if not exists updated_at timestamptz not null default now();

create table if not exists public.learning_task_assignees (
  task_id uuid not null references public.learning_tasks (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, student_id)
);

create index if not exists idx_lta_student on public.learning_task_assignees (student_id);

drop trigger if exists trg_learning_tasks_updated on public.learning_tasks;
create trigger trg_learning_tasks_updated
before update on public.learning_tasks
for each row execute function public.set_updated_at();
