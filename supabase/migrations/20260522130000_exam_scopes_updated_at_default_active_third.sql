-- exam_scopes：updated_at（多筆 active 時取最新）、預設僅第三次段考 active
-- 欄位對照：grade=8（國二）、term=2（下學期）、exam_no=3（第三次）、subject=自然（理化）
-- 若 production 尚未跑過 20260520180000，須先具備 sort_order，本檔一併補上（IF NOT EXISTS）。

alter table public.exam_scopes
  add column if not exists sort_order int not null default 0;

comment on column public.exam_scopes.sort_order is '同條件下優先序，數字越小越優先（搭配報表段考挑選）';

alter table public.exam_scopes
  add column if not exists updated_at timestamptz not null default now();

update public.exam_scopes
set updated_at = coalesce(updated_at, created_at, now())
where true;

comment on column public.exam_scopes.updated_at is '更新時間；多筆 is_active 時報表設定 API 取最新一筆';

drop trigger if exists trg_exam_scopes_updated on public.exam_scopes;
create trigger trg_exam_scopes_updated
before update on public.exam_scopes
for each row execute function public.set_updated_at();

-- 確保第三次段考存在且為主要 active（與 seed / 20260512120000 固定 UUID 一致）
insert into public.exam_scopes (
  id,
  subject,
  grade,
  term,
  exam_no,
  title,
  description,
  is_active,
  sort_order
) values (
  'b0000001-0000-4000-8000-000000000010',
  '自然（理化）',
  8,
  2,
  3,
  '國二理化下學期第三次段考',
  '有機化合物、力與壓力｜技能樹、影片學習與智慧練習',
  true,
  0
)
on conflict (id) do update set
  subject = excluded.subject,
  grade = excluded.grade,
  term = excluded.term,
  exam_no = excluded.exam_no,
  title = excluded.title,
  description = excluded.description,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

-- 第二次段考改為非 active，避免與第三次並存 active
update public.exam_scopes
set is_active = false, updated_at = now()
where id = 'b0000001-0000-4000-8000-000000000001';

update public.exam_scopes
set is_active = true, updated_at = now()
where id = 'b0000001-0000-4000-8000-000000000010';
