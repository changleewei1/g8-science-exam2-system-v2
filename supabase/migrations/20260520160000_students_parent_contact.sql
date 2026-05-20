-- 家長每日摘要 Email：聯絡資訊（僅有 parent_email 才寄送）
alter table public.students add column if not exists parent_email text null;
alter table public.students add column if not exists guardian_name text null;

comment on column public.students.parent_email is '家長／監護人 Email（每日個人摘要推播）';
comment on column public.students.guardian_name is '家長／監護人稱呼（選填）';
