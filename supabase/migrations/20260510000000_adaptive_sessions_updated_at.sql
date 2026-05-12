-- 智慧練習 session 最後更新時間（供技能練習進度追蹤）

alter table public.adaptive_practice_sessions
  add column if not exists updated_at timestamptz;

update public.adaptive_practice_sessions
set updated_at = created_at
where updated_at is null;

alter table public.adaptive_practice_sessions
  alter column updated_at set default now();

alter table public.adaptive_practice_sessions
  alter column updated_at set not null;

comment on column public.adaptive_practice_sessions.updated_at is
  '最近一次更新練習狀態（作答後由 API 寫入）';
