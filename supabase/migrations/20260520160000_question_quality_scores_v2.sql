-- 題目品質 v2：回饋脈絡欄位、AI 可信度、優先修正分、審核狀態 regenerated、重算規則

-- 1) question_feedback：skill / subject、更新時間（供近 7 日權重）
alter table public.question_feedback
  add column if not exists skill_code text;

alter table public.question_feedback
  add column if not exists subject_key text;

alter table public.question_feedback
  add column if not exists updated_at timestamptz not null default now();

comment on column public.question_feedback.skill_code is '回饋當下所屬技能代碼（智慧練習等）';
comment on column public.question_feedback.subject_key is '科目／產品線鍵值，便於跨科模組化';
comment on column public.question_feedback.updated_at is '最近更新（與 created_at 取較大者計入近 7 日權重）';

create or replace function public.trg_question_feedback_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_question_feedback_set_updated_at on public.question_feedback;
create trigger trg_question_feedback_set_updated_at
before update on public.question_feedback
for each row execute function public.trg_question_feedback_set_updated_at();

-- 2) question_bank_items：標記 AI 產題（供 ai_confidence 加權）
alter table public.question_bank_items
  add column if not exists is_ai_generated boolean not null default false;

comment on column public.question_bank_items.is_ai_generated is 'AI 產題；品質統計時 ai_confidence 對負面回饋加權';

update public.question_bank_items b
set is_ai_generated = true
where coalesce(b.is_ai_generated, false) = false
  and b.source_key is not null
  and (
    b.source_key ilike '%ai%'
    or b.source_key ilike '%generated%'
    or b.source_key like 'approve_exam3:%'
  );

-- 3) generated_question_candidates：追蹤由哪一題重產
alter table public.generated_question_candidates
  add column if not exists regenerated_from_bank_item_id uuid references public.question_bank_items (id) on delete set null;

comment on column public.generated_question_candidates.regenerated_from_bank_item_id is '若為由正式題庫觸發之重產候選，指向原題';

-- 4) question_quality_stats：擴充欄位
alter table public.question_quality_stats
  add column if not exists total_feedback_count integer not null default 0;

alter table public.question_quality_stats
  add column if not exists ai_confidence_score numeric(6, 2) not null default 100;

alter table public.question_quality_stats
  add column if not exists review_priority_score numeric(12, 2) not null default 0;

alter table public.question_quality_stats
  add column if not exists last_feedback_at timestamptz;

-- 放寬 review_status（加入 regenerated）
alter table public.question_quality_stats
  drop constraint if exists question_quality_stats_review_status_check;

alter table public.question_quality_stats
  add constraint question_quality_stats_review_status_check
  check (review_status in ('normal', 'needs_review', 'hidden', 'approved', 'regenerated'));

create index if not exists idx_question_quality_stats_priority
  on public.question_quality_stats (review_priority_score desc);

-- 5) 重算函式（取代 20260528130000 版本）
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
  tf int;
  delta_sum numeric;
  sc numeric;
  is_ai boolean;
  ai_sc numeric;
  recent_cnt int;
  recent_w numeric;
  prio numeric;
  max_fb timestamptz;
  st text;
  neg_sum int;
begin
  select coalesce(b.is_ai_generated, false)
  into is_ai
  from public.question_bank_items b
  where b.id = p_question_id;

  if not FOUND then
    return;
  end if;

  select
    count(*) filter (where f.feedback_type = 'helpful'),
    count(*) filter (where f.feedback_type = 'not_related'),
    count(*) filter (where f.feedback_type = 'confusing'),
    count(*) filter (where f.feedback_type = 'wrong_answer'),
    count(*) filter (where f.feedback_type = 'bad_explanation'),
    count(*)::int,
    coalesce(
      sum(
        case f.feedback_type
          when 'helpful' then 2
          when 'not_related' then -20
          when 'confusing' then -10
          when 'wrong_answer' then -30
          when 'bad_explanation' then -15
          else 0
        end
      ),
      0
    ),
    max(greatest(f.created_at, f.updated_at))
  into h, nr, cf, wa, be, tf, delta_sum, max_fb
  from public.question_feedback f
  where f.question_id = p_question_id;

  h := coalesce(h, 0);
  nr := coalesce(nr, 0);
  cf := coalesce(cf, 0);
  wa := coalesce(wa, 0);
  be := coalesce(be, 0);
  tf := coalesce(tf, 0);

  sc := greatest(0::numeric, least(100::numeric, 100::numeric + coalesce(delta_sum, 0::numeric)));

  neg_sum := nr + wa + cf + be;

  ai_sc := sc - (case when is_ai then (nr * 10 + wa * 10)::numeric else 0::numeric end);
  ai_sc := greatest(0::numeric, least(100::numeric, ai_sc));

  if h >= 5 and neg_sum = 0 then
    ai_sc := 100::numeric;
  end if;

  select count(*)::int
  into recent_cnt
  from public.question_feedback f2
  where f2.question_id = p_question_id
    and greatest(f2.created_at, f2.updated_at) >= (now() - interval '7 days');

  recent_w := coalesce(recent_cnt, 0)::numeric * 5::numeric;
  prio :=
    wa::numeric * 50::numeric
    + nr::numeric * 35::numeric
    + cf::numeric * 20::numeric
    + be::numeric * 25::numeric
    + recent_w;

  if sc < 50::numeric or (tf >= 5 and sc < 60::numeric) then
    st := 'hidden';
  elsif wa >= 2 or nr >= 3 or (sc >= 50::numeric and sc < 80::numeric) then
    st := 'needs_review';
  else
    st := 'normal';
  end if;

  insert into public.question_quality_stats (
    question_id,
    helpful_count,
    not_related_count,
    confusing_count,
    wrong_answer_count,
    bad_explanation_count,
    total_feedback_count,
    quality_score,
    ai_confidence_score,
    review_priority_score,
    review_status,
    last_feedback_at,
    updated_at
  )
  values (
    p_question_id,
    h,
    nr,
    cf,
    wa,
    be,
    tf,
    sc,
    ai_sc,
    prio,
    st,
    max_fb,
    now()
  )
  on conflict (question_id) do update set
    helpful_count = excluded.helpful_count,
    not_related_count = excluded.not_related_count,
    confusing_count = excluded.confusing_count,
    wrong_answer_count = excluded.wrong_answer_count,
    bad_explanation_count = excluded.bad_explanation_count,
    total_feedback_count = excluded.total_feedback_count,
    quality_score = excluded.quality_score,
    ai_confidence_score = excluded.ai_confidence_score,
    review_priority_score = excluded.review_priority_score,
    last_feedback_at = excluded.last_feedback_at,
    review_status = case
      when public.question_quality_stats.review_status = 'approved' then 'approved'
      else excluded.review_status
    end,
    updated_at = now();
end;
$$;

comment on function public.update_question_quality_score(uuid) is
  '依 question_feedback 重算品質分、AI 可信度、優先修正分與審核狀態';

-- 6) 供應用程式明確呼叫（與 trigger 並存）
create or replace function public.recalculate_question_quality(p_question_id uuid)
returns void
language plpgsql
as $$
begin
  perform public.update_question_quality_score(p_question_id);
end;
$$;

-- 7) 既有資料重算
do $$
declare
  r record;
begin
  for r in (select distinct question_id from public.question_feedback)
  loop
    perform public.update_question_quality_score(r.question_id);
  end loop;
end $$;
