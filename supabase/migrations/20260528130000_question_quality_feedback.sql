-- 學生題目品質回饋 + 題庫品質統計（question_feedback.question_id = question_bank_items.id）

alter table public.quiz_questions
  add column if not exists question_bank_item_id uuid references public.question_bank_items (id) on delete set null;

create index if not exists idx_quiz_questions_bank_item
  on public.quiz_questions (question_bank_item_id)
  where question_bank_item_id is not null;

comment on column public.quiz_questions.question_bank_item_id is '對應正式題庫 id；影片測驗由 bank 同步時寫入，供回饋與品質統計';

create table if not exists public.question_quality_stats (
  question_id uuid primary key references public.question_bank_items (id) on delete cascade,
  helpful_count integer not null default 0,
  not_related_count integer not null default 0,
  confusing_count integer not null default 0,
  wrong_answer_count integer not null default 0,
  bad_explanation_count integer not null default 0,
  quality_score numeric(6, 2) not null default 100,
  review_status text not null default 'normal'
    check (review_status in ('normal', 'needs_review', 'hidden', 'approved')),
  updated_at timestamptz not null default now()
);

create index if not exists idx_question_quality_stats_review
  on public.question_quality_stats (review_status, quality_score desc);

comment on table public.question_quality_stats is '題庫題目品質聚合：由學生回饋重算';

create table if not exists public.question_feedback (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_bank_items (id) on delete cascade,
  video_id uuid references public.videos (id) on delete set null,
  student_id uuid not null references public.students (id) on delete cascade,
  exam_scope_id uuid references public.exam_scopes (id) on delete set null,
  feedback_type text not null
    check (feedback_type in ('helpful', 'not_related', 'confusing', 'wrong_answer', 'bad_explanation')),
  comment text,
  created_at timestamptz not null default now()
);

create index if not exists idx_question_feedback_question on public.question_feedback (question_id, created_at desc);
create index if not exists idx_question_feedback_student on public.question_feedback (student_id, created_at desc);

create unique index if not exists uq_question_feedback_student_question
  on public.question_feedback (student_id, question_id);

comment on table public.question_feedback is '學生對題庫題目之品質回饋（測驗結果頁送出）';

create or replace function public.update_question_quality_score(p_question_id uuid)
returns void
language plpgsql
as $$
declare
  h int;
  nr int;
  cf int;
  wa int;
  be int;
  delta_sum numeric;
  sc numeric;
  st text;
begin
  select
    count(*) filter (where feedback_type = 'helpful'),
    count(*) filter (where feedback_type = 'not_related'),
    count(*) filter (where feedback_type = 'confusing'),
    count(*) filter (where feedback_type = 'wrong_answer'),
    count(*) filter (where feedback_type = 'bad_explanation'),
    coalesce(
      sum(
        case feedback_type
          when 'helpful' then 2
          when 'not_related' then -20
          when 'confusing' then -10
          when 'wrong_answer' then -30
          when 'bad_explanation' then -15
          else 0
        end
      ),
      0
    )
  into h, nr, cf, wa, be, delta_sum
  from public.question_feedback
  where question_id = p_question_id;

  sc := greatest(0, least(100, 100 + coalesce(delta_sum, 0)));

  st := case
    when sc < 50 then 'hidden'
    when sc < 70 or coalesce(nr, 0) >= 2 or coalesce(wa, 0) >= 2 then 'needs_review'
    else 'normal'
  end;

  insert into public.question_quality_stats (
    question_id,
    helpful_count,
    not_related_count,
    confusing_count,
    wrong_answer_count,
    bad_explanation_count,
    quality_score,
    review_status,
    updated_at
  )
  values (p_question_id, h, nr, cf, wa, be, sc, st, now())
  on conflict (question_id) do update set
    helpful_count = excluded.helpful_count,
    not_related_count = excluded.not_related_count,
    confusing_count = excluded.confusing_count,
    wrong_answer_count = excluded.wrong_answer_count,
    bad_explanation_count = excluded.bad_explanation_count,
    quality_score = excluded.quality_score,
    review_status = case
      when public.question_quality_stats.review_status = 'approved' then 'approved'
      else excluded.review_status
    end,
    updated_at = now();
end;
$$;

create or replace function public.trg_question_feedback_recompute()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    perform public.update_question_quality_score(old.question_id);
    return old;
  end if;
  perform public.update_question_quality_score(new.question_id);
  return new;
end;
$$;

drop trigger if exists trg_question_feedback_recompute_iu on public.question_feedback;
create trigger trg_question_feedback_recompute_iu
after insert or update on public.question_feedback
for each row execute function public.trg_question_feedback_recompute();

drop trigger if exists trg_question_feedback_recompute_d on public.question_feedback;
create trigger trg_question_feedback_recompute_d
after delete on public.question_feedback
for each row execute function public.trg_question_feedback_recompute();
