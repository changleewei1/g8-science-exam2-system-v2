-- 影片 skill_code AI 初判候選（審核後才會寫入正式 video_skill_tags）

create table if not exists public.video_skill_mapping_candidates (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  video_title text,
  unit text,
  suggested_skill_code text not null,
  suggested_skill_name text,
  confidence numeric,
  reason text,
  subtitle_available boolean not null default false,
  status text not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vsmc_status_created
  on public.video_skill_mapping_candidates (status, created_at desc);

create index if not exists idx_vsmc_video_skill
  on public.video_skill_mapping_candidates (video_id, suggested_skill_code);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'chk_vsmc_status'
  ) then
    alter table public.video_skill_mapping_candidates
      add constraint chk_vsmc_status
      check (status in ('pending', 'approved', 'rejected'));
  end if;
end $$;

comment on table public.video_skill_mapping_candidates is
  'AI 初判影片技能候選；老師審核後才同步至正式 video_skill_tags';
