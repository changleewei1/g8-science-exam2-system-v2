-- LINE 家長多步驟查詢：目前選中的功能與逾時（與 parent_line_subscribers 分表，不修改既有表）

create table public.line_user_contexts (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null unique,
  pending_action text not null
    check (
      pending_action in (
        'homework_status',
        'learning_performance',
        'video_recommendation'
      )
    ),
  pending_student_id uuid null references public.students (id) on delete set null,
  pending_student_name text null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.line_user_contexts is '家長 LINE 查詢流程狀態（待輸入科目等）；單一 line_user_id 一筆。';

create index idx_line_user_contexts_expires_at on public.line_user_contexts (expires_at);
