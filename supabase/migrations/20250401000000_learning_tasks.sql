-- 學習任務（影片預習）

create table public.learning_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  class_name text not null,
  created_at timestamptz not null default now()
);

create index idx_learning_tasks_class on public.learning_tasks(class_name);
create index idx_learning_tasks_dates on public.learning_tasks(start_date, end_date);

create table public.task_videos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.learning_tasks(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  day_index int not null check (day_index >= 1),
  created_at timestamptz not null default now(),
  unique(task_id, video_id)
);

create index idx_task_videos_task on public.task_videos(task_id);
create index idx_task_videos_video on public.task_videos(video_id);

create table public.student_task_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  task_id uuid not null references public.learning_tasks(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(student_id, task_id, video_id)
);

create index idx_stp_task on public.student_task_progress(task_id);
create index idx_stp_student on public.student_task_progress(student_id);

create trigger trg_stp_updated
before update on public.student_task_progress
for each row execute function public.set_updated_at();
