-- 學習任務：綁定段考範圍（篩選影片）；任務層級「已開啟」追蹤（學生點進任務列表）

alter table public.learning_tasks
  add column if not exists exam_scope_id uuid references public.exam_scopes (id) on delete set null;

create index if not exists idx_learning_tasks_exam_scope on public.learning_tasks (exam_scope_id);

alter table public.task_student_progress
  add column if not exists opened_at timestamptz,
  add column if not exists first_seen_at timestamptz;

comment on column public.task_student_progress.opened_at is '學生曾進入學習任務頁並標記已讀（任務層級）';
comment on column public.task_student_progress.first_seen_at is '首次標記已讀時間';

-- 規格另述 student_task_progress 欄位；既有表已有 completed_at，任務層級 opened 使用 task_student_progress 較精簡。
