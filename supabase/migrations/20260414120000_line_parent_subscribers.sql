-- LINE 家長綁定與訊息紀錄（MVP）
-- 每位學生最多兩位家長：MVP 由應用層 COUNT + INSERT 實作；併發同時綁定仍可能短暫超過兩位，第二階段建議以 DB trigger / 函式或 SELECT FOR UPDATE 鎖定 student_id 後再 insert。

create table public.parent_line_subscribers (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  student_id uuid not null references public.students (id) on delete cascade,
  role text not null check (role in ('father', 'mother')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (line_user_id, student_id)
);

create index idx_parent_line_subscribers_student_id
  on public.parent_line_subscribers (student_id)
  where is_active = true;

create index idx_parent_line_subscribers_line_user_id
  on public.parent_line_subscribers (line_user_id)
  where is_active = true;

comment on table public.parent_line_subscribers is 'LINE UserId 與學生綁定；同一組 (line_user_id, student_id) 僅一筆。';

create table public.line_message_send_logs (
  id uuid primary key default gen_random_uuid(),
  line_user_id text,
  direction text not null,
  message_type text,
  text_preview text,
  line_message_id text,
  reply_token text,
  status text not null,
  error_message text,
  created_at timestamptz not null default now()
);

create index idx_line_message_send_logs_line_user_created
  on public.line_message_send_logs (line_user_id, created_at desc);

comment on table public.line_message_send_logs is 'LINE Webhook／回覆之簡要紀錄，供除錯與稽核。';
