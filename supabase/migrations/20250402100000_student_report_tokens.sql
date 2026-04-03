-- 學生學習報告：家長分享連結 token

create table public.student_report_tokens (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  task_id uuid references public.learning_tasks(id) on delete set null,
  token text not null unique,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_student_report_tokens_student on public.student_report_tokens(student_id);
create index idx_student_report_tokens_token on public.student_report_tokens(token);
