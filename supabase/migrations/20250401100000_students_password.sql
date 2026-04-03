-- 學生登入密碼（可為 null：僅學號登入，相容舊資料）
alter table public.students add column if not exists password_hash text;

comment on column public.students.password_hash is 'scrypt 雜湊（salt.hash）；null 表示僅驗證學號';
