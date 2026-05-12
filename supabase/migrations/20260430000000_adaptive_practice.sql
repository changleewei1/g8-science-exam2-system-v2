-- 智慧練習模式（Adaptive Practice MVP）：練習場次與作答紀錄

create table public.adaptive_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  skill_code text not null,
  score int not null default 50,
  current_difficulty text not null default '基礎',
  streak int not null default 0,
  is_mastered boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_adaptive_practice_sessions_student on public.adaptive_practice_sessions (student_id);
create index idx_adaptive_practice_sessions_skill on public.adaptive_practice_sessions (skill_code);

comment on table public.adaptive_practice_sessions is '智慧練習：依 skill_code 的練習場次（熟練度、難度、連續答對）';

create table public.adaptive_practice_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.adaptive_practice_sessions (id) on delete cascade,
  question_id uuid not null references public.question_bank_items (id) on delete restrict,
  is_correct boolean not null,
  difficulty text not null,
  created_at timestamptz not null default now()
);

create index idx_adaptive_practice_answers_session on public.adaptive_practice_answers (session_id);

comment on table public.adaptive_practice_answers is '智慧練習：單題作答紀錄';
