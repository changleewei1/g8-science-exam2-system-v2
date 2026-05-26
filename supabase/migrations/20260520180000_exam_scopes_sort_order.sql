-- 每日報表等用途：多筆 active 段考時可依 sort_order 微調優先序（程式仍以第三次段考為主規則）
alter table public.exam_scopes
  add column if not exists sort_order int not null default 0;

comment on column public.exam_scopes.sort_order is '同條件下優先序，數字越小越優先（搭配 pickPrimaryActiveExamScopeForDailyReport）';

-- 國二下學期第三次段考（與 seed id 一致）優先序設為 0
update public.exam_scopes
set sort_order = 0
where id = 'b0000001-0000-4000-8000-000000000010';

-- 其餘段考維持預設 0；若需明確讓第二次排後，可改為較大數字
update public.exam_scopes
set sort_order = 10
where id = 'b0000001-0000-4000-8000-000000000001'
  and sort_order = 0;
