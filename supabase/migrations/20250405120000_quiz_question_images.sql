-- 測驗題圖片：題幹／參考圖／選項圖（https 網址）
alter table public.quiz_questions
  add column if not exists question_image_url text,
  add column if not exists reference_image_url text,
  add column if not exists choice_a_image_url text,
  add column if not exists choice_b_image_url text,
  add column if not exists choice_c_image_url text,
  add column if not exists choice_d_image_url text;

-- 公開 bucket（上傳僅能由後端 service role 執行；RLS 不影響 service role）
insert into storage.buckets (id, name, public)
values ('quiz-assets', 'quiz-assets', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "quiz_assets_select_public" on storage.objects;

create policy "quiz_assets_select_public"
on storage.objects for select
to public
using (bucket_id = 'quiz-assets');
