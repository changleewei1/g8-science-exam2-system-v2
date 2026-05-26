-- 老師每日報表／家長摘要可調整設定（singleton：report_scope）

create table if not exists public.teacher_report_preferences (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid null,
  report_scope text not null default 'g8_science',
  email_enabled boolean not null default true,
  send_time text not null default '21:00',
  enabled_sections jsonb not null default '{}'::jsonb,
  parent_summary_enabled boolean not null default false,
  parent_send_mode text not null default 'manual',
  parent_enabled_sections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_scope)
);

comment on table public.teacher_report_preferences is '老師每日 Email 與家長摘要區塊設定；無 teacher_id 時以 report_scope singleton 使用';
comment on column public.teacher_report_preferences.enabled_sections is '老師信各區塊開關，key 見程式 DEFAULT_TEACHER_EMAIL_SECTIONS';
comment on column public.teacher_report_preferences.parent_send_mode is 'manual | all | risk_only | incomplete_only';
comment on column public.teacher_report_preferences.parent_enabled_sections is '家長信各區塊開關';

create or replace function public.set_teacher_report_preferences_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_teacher_report_preferences_updated_at on public.teacher_report_preferences;
create trigger trg_teacher_report_preferences_updated_at
  before update on public.teacher_report_preferences
  for each row execute function public.set_teacher_report_preferences_updated_at();

insert into public.teacher_report_preferences (
  id,
  teacher_id,
  report_scope,
  email_enabled,
  send_time,
  enabled_sections,
  parent_summary_enabled,
  parent_send_mode,
  parent_enabled_sections
) values (
  'c0000001-0000-4000-8000-000000000001',
  null,
  'g8_science',
  true,
  '21:00',
  '{}'::jsonb,
  false,
  'manual',
  '{}'::jsonb
)
on conflict (report_scope) do nothing;
