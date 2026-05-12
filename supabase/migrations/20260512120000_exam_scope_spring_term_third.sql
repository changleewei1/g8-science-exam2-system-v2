-- 下學期第三次段考（與第二次段考並存；不修改既有 b0000001-0000-4000-8000-000000000001 及其單元／影片）

insert into public.exam_scopes (
  id,
  subject,
  grade,
  term,
  exam_no,
  title,
  description,
  is_active
) values (
  'b0000001-0000-4000-8000-000000000010',
  '自然（理化）',
  8,
  2,
  3,
  '國二理化下學期第三次段考',
  '有機化合物、力與壓力｜技能樹、影片學習與智慧練習',
  true
)
on conflict (id) do nothing;

insert into public.scope_units (id, exam_scope_id, unit_code, unit_title, sort_order) values
  ('b0000001-0000-4000-8000-000000000011', 'b0000001-0000-4000-8000-000000000010', 'U-ORGANIC', '有機化合物', 1),
  ('b0000001-0000-4000-8000-000000000012', 'b0000001-0000-4000-8000-000000000010', 'U-FORCE', '力與壓力', 2)
on conflict (id) do nothing;
