-- 修補：parent_line_subscribers 若為舊版結構，補上 role（father / mother）

alter table public.parent_line_subscribers
  add column if not exists role text;

update public.parent_line_subscribers
set role = 'father'
where role is null;

alter table public.parent_line_subscribers
  alter column role set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'parent_line_subscribers_role_check'
  ) then
    alter table public.parent_line_subscribers
      add constraint parent_line_subscribers_role_check
      check (role in ('father', 'mother'));
  end if;
end
$$;
