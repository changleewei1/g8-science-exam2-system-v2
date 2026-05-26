-- 每日報表：段考範圍、單元篩選、報表模式

alter table public.teacher_report_preferences
  add column if not exists selected_scope_id uuid null references public.exam_scopes (id) on delete set null,
  add column if not exists selected_unit_ids jsonb not null default '[]'::jsonb,
  add column if not exists report_mode text not null default 'preview';

comment on column public.teacher_report_preferences.selected_scope_id is '每日報表固定段考；null 時沿用 API／環境變數／自動挑選';
comment on column public.teacher_report_preferences.selected_unit_ids is '僅統計之 scope_units.id 陣列；空陣列表示該段考下全部單元';
comment on column public.teacher_report_preferences.report_mode is 'preview | practice | sprint | review';

alter table public.teacher_report_preferences
  drop constraint if exists teacher_report_preferences_report_mode_check;

alter table public.teacher_report_preferences
  add constraint teacher_report_preferences_report_mode_check
  check (report_mode in ('preview', 'practice', 'sprint', 'review'));
