-- 初始資料：段考 scope、單元、技能標籤、範例學生
-- 執行前請先套用 migrations（至少需 20250331000000_initial.sql）。可於 Supabase SQL Editor 手動執行。
-- UUID 與其他專案區隔；skill_tags 為國二理化 v2 正式版（含 domain / category / difficulty）。

-- 與 migration 20250403200000_skill_tags_add_domain.sql 等價：若尚未套用該檔，先補欄位再 INSERT
alter table public.skill_tags add column if not exists domain text;

-- 段考範圍（固定 UUID 方便 .env 對應；與 src/seed/playlist-config.ts 之 unitId 父層一致）
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

-- scope_units.id 說明：
-- …000002 = 酸鹼中和（skill_tags 以 acid_base 標示之內容所屬「學習單元」）
-- …000003 = 反應速率（skill_tags 以 reaction_rate 標示）
insert into public.scope_units (id, exam_scope_id, unit_code, unit_title, sort_order) values
  ('b0000001-0000-4000-8000-000000000002', 'b0000001-0000-4000-8000-000000000001', 'U-ACID-BASE', '酸鹼中和', 1),
  ('b0000001-0000-4000-8000-000000000003', 'b0000001-0000-4000-8000-000000000001', 'U-RATE', '反應速率', 2)
on conflict (id) do update set
  exam_scope_id = excluded.exam_scope_id,
  unit_code = excluded.unit_code,
  unit_title = excluded.unit_title,
  sort_order = excluded.sort_order;

-- 國二理化 801 班學生（學號：80101–80123；重跑 seed 會依 student_code 更新姓名）
-- 注意：請勿在此檔使用 DELETE／TRUNCATE，否則 Supabase SQL Editor 會跳出「destructive operations」警告。
-- 若資料庫內仍有舊範例帳號 demo001，請另開一筆查詢、確認後再手動執行：
--   delete from public.students where student_code = 'demo001';

insert into public.students (student_code, name, grade, class_name, is_active) values
  ('80101', '陳裔淇', 8, '801', true),
  ('80102', '黃鈺翔', 8, '801', true),
  ('80103', '陽岱諺', 8, '801', true),
  ('80104', '林楷峻', 8, '801', true),
  ('80105', '陳廷晏', 8, '801', true),
  ('80106', '林新澤', 8, '801', true),
  ('80107', '陳楷博', 8, '801', true),
  ('80108', '侯君蔚', 8, '801', true),
  ('80109', '林羽晴', 8, '801', true),
  ('80110', '林禹綺', 8, '801', true),
  ('80111', '陳宥辰', 8, '801', true),
  ('80112', '吳佳玟', 8, '801', true),
  ('80113', '陳雨彤', 8, '801', true),
  ('80114', '許立洋', 8, '801', true),
  ('80115', '陳喬妤', 8, '801', true),
  ('80116', '王亮豫', 8, '801', true),
  ('80117', '陳浚騰', 8, '801', true),
  ('80118', '林浩宇', 8, '801', true),
  ('80119', '陳睿翎', 8, '801', true),
  ('80120', '王彥翔', 8, '801', true),
  ('80121', '張天郡', 8, '801', true),
  ('80122', '吳宥賢', 8, '801', true),
  ('80123', '吳睿洋', 8, '801', true)
on conflict (student_code) do update set
  name = excluded.name,
  grade = excluded.grade,
  class_name = excluded.class_name,
  is_active = excluded.is_active;

-- 國二理化 v2：skill_tags（unit：acid_base / reaction_rate；category：Concept / Procedure / Application；difficulty：基礎／進階；domain：chemistry）
insert into public.skill_tags (code, name, unit, category, difficulty, domain) values
  ('EL01', '電解質的基本概念', 'acid_base', 'Concept', '基礎', 'chemistry'),
  ('EL02', '電解質與非電解質', 'acid_base', 'Concept', '基礎', 'chemistry'),
  ('EL03', '電解質導電原因', 'acid_base', 'Procedure', '基礎', 'chemistry'),
  ('EL04', '判斷電解質', 'acid_base', 'Procedure', '進階', 'chemistry'),
  ('EL05', '強弱電解質的概念', 'acid_base', 'Concept', '進階', 'chemistry'),
  ('EL06', '電解質的生活應用', 'acid_base', 'Application', '基礎', 'chemistry'),
  ('AB01', '酸的基本性質', 'acid_base', 'Concept', '基礎', 'chemistry'),
  ('AB02', '鹼的基本性質', 'acid_base', 'Concept', '基礎', 'chemistry'),
  ('AB03', '常見酸性物質', 'acid_base', 'Procedure', '基礎', 'chemistry'),
  ('AB04', '常見鹼性物質', 'acid_base', 'Procedure', '基礎', 'chemistry'),
  ('AB05', '判斷酸鹼性', 'acid_base', 'Procedure', '進階', 'chemistry'),
  ('AB06', '酸鹼在生活中的應用', 'acid_base', 'Application', '基礎', 'chemistry'),
  ('CO01', '濃度的意義', 'acid_base', 'Concept', '基礎', 'chemistry'),
  ('CO02', '濃淡的比較', 'acid_base', 'Procedure', '基礎', 'chemistry'),
  ('CO03', '簡單濃度判斷', 'acid_base', 'Procedure', '進階', 'chemistry'),
  ('CO04', '稀釋後濃度變化', 'acid_base', 'Procedure', '進階', 'chemistry'),
  ('CO05', '生活中的濃度調整', 'acid_base', 'Application', '基礎', 'chemistry'),
  ('NE01', '中和反應的意義', 'acid_base', 'Concept', '基礎', 'chemistry'),
  ('NE02', '中和前後性質變化', 'acid_base', 'Procedure', '基礎', 'chemistry'),
  ('NE03', '判斷是否為中和反應', 'acid_base', 'Procedure', '進階', 'chemistry'),
  ('NE04', '中和反應的簡單分析', 'acid_base', 'Procedure', '進階', 'chemistry'),
  ('NE05', '中和反應的生活應用', 'acid_base', 'Application', '基礎', 'chemistry'),
  ('RS01', '反應速率的意義', 'reaction_rate', 'Concept', '基礎', 'chemistry'),
  ('RS02', '影響反應速率的因素', 'reaction_rate', 'Concept', '基礎', 'chemistry'),
  ('RS03', '溫度對反應速率的影響', 'reaction_rate', 'Procedure', '基礎', 'chemistry'),
  ('RS04', '濃度對反應速率的影響', 'reaction_rate', 'Procedure', '基礎', 'chemistry'),
  ('RS05', '比較反應快慢', 'reaction_rate', 'Procedure', '進階', 'chemistry'),
  ('RS06', '控制變因的判斷', 'reaction_rate', 'Procedure', '進階', 'chemistry'),
  ('RS07', '生活中的反應速率', 'reaction_rate', 'Application', '基礎', 'chemistry'),
  ('RS08', '反應速率的定量比較', 'reaction_rate', 'Procedure', '進階', 'chemistry'),
  ('RS09', '平均反應速率計算', 'reaction_rate', 'Procedure', '進階', 'chemistry'),
  ('RS10', '反應速率圖表判讀', 'reaction_rate', 'Procedure', '進階', 'chemistry'),
  ('RS11', '條件改變下的速率比較', 'reaction_rate', 'Procedure', '進階', 'chemistry')
on conflict (code) do update set
  name = excluded.name,
  unit = excluded.unit,
  category = excluded.category,
  difficulty = excluded.difficulty,
  domain = excluded.domain;
