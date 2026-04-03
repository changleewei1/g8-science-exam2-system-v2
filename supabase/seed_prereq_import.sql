-- 僅供「先跑 import:playlists」所需：exam_scopes + scope_units
-- 若已執行完整 seed.sql，此檔可略過（內容與 seed.sql 前段一致，可重複執行）
-- 執行後再跑：npm run import:playlists

insert into public.exam_scopes (
  id, subject, grade, term, exam_no, title, description, is_active
) values (
  'b0000001-0000-4000-8000-000000000001',
  '自然（理化）',
  8,
  2,
  2,
  '國二理化第二次段考',
  '酸鹼中和、反應速率｜預習影片與AI學習診斷',
  true
) on conflict (id) do update set
  subject = excluded.subject,
  grade = excluded.grade,
  term = excluded.term,
  exam_no = excluded.exam_no,
  title = excluded.title,
  description = excluded.description,
  is_active = excluded.is_active;

insert into public.scope_units (id, exam_scope_id, unit_code, unit_title, sort_order) values
  ('b0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000001', 'U-ACID-BASE', '酸鹼中和', 1),
  ('b0000001-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000001', 'U-RATE', '反應速率', 2)
on conflict (id) do update set
  exam_scope_id = excluded.exam_scope_id,
  unit_code = excluded.unit_code,
  unit_title = excluded.unit_title,
  sort_order = excluded.sort_order;
