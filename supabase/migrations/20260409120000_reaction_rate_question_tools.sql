-- 反應速率題庫優化：配題池軟排除 + 候選題（不影響現有 quiz_questions 列，除非另執行 seed:g8-video-quiz）

alter table public.question_bank_items
  add column if not exists excluded_from_video_quiz_pool boolean not null default false;

comment on column public.question_bank_items.excluded_from_video_quiz_pool is
  '若為 true，seed:g8-video-quiz 選題時會略過此題（不移除資料；酸鹼與其他單元預設 false）';

create index if not exists idx_question_bank_items_not_excluded_skill
  on public.question_bank_items (skill_code)
  where excluded_from_video_quiz_pool = false;

-- 候選題：status=new 同步時寫入；確認後再以 promote 腳本匯入正式 question_bank_items
create table if not exists public.reaction_rate_question_candidates (
  id uuid primary key default gen_random_uuid(),
  skill_code text not null,
  difficulty text not null default '基礎',
  question_text text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_answer text not null,
  explanation text,
  sort_order int not null default 0,
  source_key text,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'promoted', 'rejected')),
  promoted_bank_item_id uuid references public.question_bank_items (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_rr_candidates_status on public.reaction_rate_question_candidates (review_status);
create index if not exists idx_rr_candidates_skill on public.reaction_rate_question_candidates (skill_code);

comment on table public.reaction_rate_question_candidates is
  '反應速率單元候選題（與正式 quiz_questions 分離；promote 後進 question_bank_items）';
