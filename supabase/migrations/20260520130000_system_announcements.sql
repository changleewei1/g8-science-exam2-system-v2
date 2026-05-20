-- 首頁「系統公告」內容（由老師後台維護）

create table if not exists public.system_announcements (
  id text primary key,
  title text not null default '系統公告',
  items text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

comment on table public.system_announcements is '首頁 Hero 系統公告；id=home 為目前使用列';

insert into public.system_announcements (id, title, items)
values (
  'home',
  '系統公告',
  array[
    '國中理化 AI 智慧學習測試系統已開放第二次、第三次段考預習範圍。',
    '學生請由「學生登入」進入，依段考範圍觀看影片並完成 AI 理解測驗。',
    '老師請由「老師登入」查看班級學習進度與診斷數據。',
    '如有帳號或技術問題，請洽名貫補習班櫃台。'
  ]::text[]
)
on conflict (id) do nothing;
