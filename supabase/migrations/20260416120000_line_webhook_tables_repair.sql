-- 修補：若遠端 DB 未套用 20260414120000 / 20260415120000，或 line_message_send_logs 結構舊版缺少 direction。
-- 可重複執行（IF NOT EXISTS / 僅在缺欄時 ALTER）。

-- 1) parent_line_subscribers（若尚無表則建立）
create table if not exists public.parent_line_subscribers (
  id uuid primary key default gen_random_uuid(),
  line_user_id text not null,
  student_id uuid not null references public.students (id) on delete cascade,
  role text not null check (role in ('father', 'mother')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (line_user_id, student_id)
);

create index if not exists idx_parent_line_subscribers_student_id
  on public.parent_line_subscribers (student_id)
  where is_active = true;

create index if not exists idx_parent_line_subscribers_line_user_id
  on public.parent_line_subscribers (line_user_id)
  where is_active = true;

-- 2) line_message_send_logs（整表或缺欄補齊）
create table if not exists public.line_message_send_logs (
  id uuid primary key default gen_random_uuid(),
  line_user_id text,
  direction text not null default 'inbound',
  message_type text,
  text_preview text,
  line_message_id text,
  reply_token text,
  status text not null default 'ok',
  error_message text,
  created_at timestamptz not null default now()
);

-- 舊表若已存在但缺欄，逐一補上（不覆寫既有資料）
alter table public.line_message_send_logs
  add column if not exists direction text default 'inbound';

alter table public.line_message_send_logs
  add column if not exists message_type text;

alter table public.line_message_send_logs
  add column if not exists text_preview text;

alter table public.line_message_send_logs
  add column if not exists line_message_id text;

alter table public.line_message_send_logs
  add column if not exists reply_token text;

alter table public.line_message_send_logs
  add column if not exists status text default 'ok';

alter table public.line_message_send_logs
  add column if not exists error_message text;

alter table public.line_message_send_logs
  add column if not exists created_at timestamptz default now();

-- direction / status 盡量設為 not null（僅在可安全填預設時）
update public.line_message_send_logs set direction = 'inbound' where direction is null;
update public.line_message_send_logs set status = 'ok' where status is null;

alter table public.line_message_send_logs alter column direction set not null;
alter table public.line_message_send_logs alter column status set not null;

create index if not exists idx_line_message_send_logs_line_user_created
  on public.line_message_send_logs (line_user_id, created_at desc);

-- 3) line_user_contexts
create table if not exists public.line_user_contexts (
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

create index if not exists idx_line_user_contexts_expires_at on public.line_user_contexts (expires_at);
