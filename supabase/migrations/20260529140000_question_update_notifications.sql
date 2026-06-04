-- 題庫版本與「題目已更新」通知（老師改題後通知曾作答／曾完成該片測驗的學生）

alter table public.question_bank_items
  add column if not exists version integer not null default 1;

alter table public.question_bank_items
  add column if not exists change_reason text;

alter table public.question_bank_items
  add column if not exists updated_at timestamptz;

comment on column public.question_bank_items.version is '題庫題版本；內容變更時由 trigger +1';
comment on column public.question_bank_items.change_reason is '最近一次變更說明（可選）';
comment on column public.question_bank_items.updated_at is '題庫內容最近變更時間';

-- 既有列：updated_at 先對齊 created_at
update public.question_bank_items
set updated_at = coalesce(updated_at, created_at)
where updated_at is null;

create table if not exists public.question_bank_item_revisions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_bank_items (id) on delete cascade,
  version integer not null,
  previous_version integer not null,
  change_reason text,
  edited_at timestamptz not null default now(),
  editor_label text
);

create index if not exists idx_qbir_question_edited
  on public.question_bank_item_revisions (question_id, edited_at desc);

comment on table public.question_bank_item_revisions is '題庫題版本歷史（內容變更時寫入）';

create table if not exists public.question_update_notifications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students (id) on delete cascade,
  question_id uuid not null references public.question_bank_items (id) on delete cascade,
  old_version integer not null,
  new_version integer not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_question_update_notif_student_q_newver
  on public.question_update_notifications (student_id, question_id, new_version);

create index if not exists idx_qun_student_read
  on public.question_update_notifications (student_id, is_read, created_at desc);

comment on table public.question_update_notifications is '學生端：題庫升版提醒（曾作答該題或曾完成該片測驗）';

-- 內容變更時自動升版（不信任 client 傳入的 version）
create or replace function public.trg_question_bank_items_bump_version()
returns trigger
language plpgsql
as $$
declare
  changed boolean;
begin
  changed :=
    old.question_text is distinct from new.question_text
    or old.choice_a is distinct from new.choice_a
    or old.choice_b is distinct from new.choice_b
    or old.choice_c is distinct from new.choice_c
    or old.choice_d is distinct from new.choice_d
    or old.correct_answer is distinct from new.correct_answer
    or old.explanation is distinct from new.explanation;

  if changed then
    new.version := coalesce(old.version, 1) + 1;
    new.updated_at := now();
    if new.change_reason is null or btrim(new.change_reason) = '' then
      new.change_reason := '題目內容已更新';
    end if;
  else
    new.version := coalesce(old.version, 1);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_question_bank_items_bump_version on public.question_bank_items;
create trigger trg_question_bank_items_bump_version
before update on public.question_bank_items
for each row execute function public.trg_question_bank_items_bump_version();

-- 升版後：歷史 + 通知曾作答該題或曾提交該片測驗的學生
create or replace function public.trg_question_bank_items_after_version_notify()
returns trigger
language plpgsql
as $$
begin
  if new.version > coalesce(old.version, 1) then
    insert into public.question_bank_item_revisions (
      question_id,
      version,
      previous_version,
      change_reason,
      edited_at,
      editor_label
    )
    values (
      new.id,
      new.version,
      coalesce(old.version, 1),
      new.change_reason,
      now(),
      null
    );

    insert into public.question_update_notifications (
      student_id,
      question_id,
      old_version,
      new_version
    )
    select distinct x.student_id,
      new.id,
      coalesce(old.version, 1),
      new.version
    from (
      select distinct att.student_id
      from public.student_quiz_answers sqa
      join public.student_quiz_attempts att on att.id = sqa.attempt_id
      join public.quiz_questions qq on qq.id = sqa.question_id
      where qq.question_bank_item_id = new.id
        and att.submitted_at is not null
      union
      select distinct att.student_id
      from public.student_quiz_attempts att
      join public.quizzes q on q.id = att.quiz_id
      where new.video_id is not null
        and q.video_id = new.video_id
        and att.submitted_at is not null
    ) x
    on conflict (student_id, question_id, new_version) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_question_bank_items_after_version on public.question_bank_items;
create trigger trg_question_bank_items_after_version
after update on public.question_bank_items
for each row execute function public.trg_question_bank_items_after_version_notify();
