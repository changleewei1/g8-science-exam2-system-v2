-- 修補：舊版 parent_line_subscribers 可能缺 is_active / created_at / updated_at，導致查詢綁定時 PostgREST 錯誤或篩不到資料

alter table public.parent_line_subscribers
  add column if not exists is_active boolean default true;

update public.parent_line_subscribers
set is_active = true
where is_active is null;

alter table public.parent_line_subscribers
  alter column is_active set default true;

alter table public.parent_line_subscribers
  alter column is_active set not null;

alter table public.parent_line_subscribers
  add column if not exists created_at timestamptz default now();

alter table public.parent_line_subscribers
  add column if not exists updated_at timestamptz default now();

update public.parent_line_subscribers
set
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, now())
where created_at is null or updated_at is null;

alter table public.parent_line_subscribers
  alter column created_at set default now();

alter table public.parent_line_subscribers
  alter column updated_at set default now();

alter table public.parent_line_subscribers
  alter column created_at set not null;

alter table public.parent_line_subscribers
  alter column updated_at set not null;
