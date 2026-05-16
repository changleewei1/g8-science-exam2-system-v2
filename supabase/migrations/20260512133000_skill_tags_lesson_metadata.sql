-- 技能標籤延伸欄位（nullable）：供第三次段考等有「課本次單元」與教學說明之種子使用；不修改既有列內容。
alter table public.skill_tags add column if not exists lesson_unit text;
alter table public.skill_tags add column if not exists skill_detail text;
alter table public.skill_tags add column if not exists common_mistakes text;
alter table public.skill_tags add column if not exists ai_detection_rule text;
alter table public.skill_tags add column if not exists sample_question text;
alter table public.skill_tags add column if not exists exam_scope_title text;

comment on column public.skill_tags.lesson_unit is '課本次單元（例 5-1）；unit 仍為段考 scope 大單元之 unit_title（與 scope_units 對齊）';
comment on column public.skill_tags.skill_detail is '技能說明／學習目標';
comment on column public.skill_tags.common_mistakes is '常見迷思';
comment on column public.skill_tags.ai_detection_rule is '判讀／檢核要點';
comment on column public.skill_tags.sample_question is '範例題敘述';
comment on column public.skill_tags.exam_scope_title is '所屬段考名稱（與 exam_scopes.title 對齊之文字）';
