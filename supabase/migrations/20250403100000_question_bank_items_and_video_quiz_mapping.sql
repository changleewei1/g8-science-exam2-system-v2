-- 題庫項目（JSON seed 匯入，供 seed:g8-video-quiz 配題）
-- 影片↔測驗對照表（1:1，與 public.quizzes 同步）

create table public.question_bank_items (
  id uuid primary key default gen_random_uuid(),
  unit text not null,
  skill_code text not null,
  difficulty text not null,
  question_text text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_answer text not null,
  explanation text,
  sort_order int not null default 0,
  source_key text,
  created_at timestamptz not null default now()
);

create index idx_question_bank_items_skill on public.question_bank_items(skill_code);
create index idx_question_bank_items_unit on public.question_bank_items(unit);

comment on table public.question_bank_items is '國二理化段考題庫（可由 seed:g8-question-bank 從 JSON 匯入）';

-- 與 quizzes 一對一；新建立的 quiz 會由 trigger 寫入
create table public.video_quiz_mapping (
  video_id uuid primary key references public.videos(id) on delete cascade,
  quiz_id uuid not null unique references public.quizzes(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index idx_video_quiz_mapping_quiz on public.video_quiz_mapping(quiz_id);

comment on table public.video_quiz_mapping is '影片與測驗對照（1:1），與 quizzes.video_id 一致';

insert into public.video_quiz_mapping (video_id, quiz_id)
select q.video_id, q.id
from public.quizzes q
on conflict (video_id) do nothing;

create or replace function public.sync_video_quiz_mapping()
returns trigger as $$
begin
  insert into public.video_quiz_mapping (video_id, quiz_id)
  values (new.video_id, new.id)
  on conflict (video_id) do update
    set quiz_id = excluded.quiz_id,
        created_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_quizzes_sync_video_quiz_mapping
after insert on public.quizzes
for each row execute function public.sync_video_quiz_mapping();
