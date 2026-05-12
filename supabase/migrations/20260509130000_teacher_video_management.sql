-- 老師影片管理中心：公開狀態、技能候選字幕節錄、AI 題目候選（審核後才進正式題庫）

-- 1) videos.management_status
alter table public.videos
  add column if not exists management_status text;

update public.videos
set management_status = 'active'
where management_status is null or trim(management_status) = '';

alter table public.videos
  alter column management_status set default 'active';

alter table public.videos
  alter column management_status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_videos_management_status'
  ) then
    alter table public.videos
      add constraint chk_videos_management_status
      check (management_status in ('draft', 'pending_review', 'active'));
  end if;
end $$;

comment on column public.videos.management_status is
  'draft=草稿；pending_review=待審核；active=可被學生端顯示流程納入（仍須 is_active）';

-- 2) video_skill_mapping_candidates：字幕節錄
alter table public.video_skill_mapping_candidates
  add column if not exists subtitle_excerpt text;

-- 3) generated_question_candidates
create table if not exists public.generated_question_candidates (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos (id) on delete cascade,
  unit text not null,
  skill_code text not null,
  difficulty text not null default '基礎',
  question_text text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_answer text not null,
  explanation text,
  source_excerpt text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  promoted_bank_item_id uuid references public.question_bank_items (id) on delete set null
);

create index if not exists idx_gqc_video_status_created
  on public.generated_question_candidates (video_id, status, created_at desc);

create index if not exists idx_gqc_skill_status
  on public.generated_question_candidates (skill_code, status);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_gqc_status'
  ) then
    alter table public.generated_question_candidates
      add constraint chk_gqc_status
      check (status in ('draft', 'approved', 'rejected'));
  end if;
end $$;

comment on table public.generated_question_candidates is
  'AI 依影片字幕產生之題目候選；核准後才寫入 question_bank_items';
