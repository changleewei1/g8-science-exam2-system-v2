-- 第三次段考：題庫與影片／段考範圍關聯；不修改既有列（僅加欄位，nullable）

alter table public.question_bank_items
  add column if not exists video_id uuid references public.videos (id) on delete set null;

alter table public.question_bank_items
  add column if not exists exam_scope_id uuid references public.exam_scopes (id) on delete set null;

alter table public.question_bank_items
  add column if not exists question_type text not null default 'single_choice';

comment on column public.question_bank_items.video_id is '影片專屬題（第三次段考 AI 審核入庫）；null 表示共用題庫';
comment on column public.question_bank_items.exam_scope_id is '所屬段考範圍（可選）';
comment on column public.question_bank_items.question_type is '題型，例如 single_choice';

create index if not exists idx_question_bank_items_video_id
  on public.question_bank_items (video_id)
  where video_id is not null;

-- 候選題：便於依第三次段考篩選
alter table public.generated_question_candidates
  add column if not exists exam_scope_id uuid references public.exam_scopes (id) on delete set null;

create index if not exists idx_gqc_exam_scope_status
  on public.generated_question_candidates (exam_scope_id, status, created_at desc);

comment on column public.generated_question_candidates.exam_scope_id is '影片所屬段考（由 video→scope_units 帶入）';
