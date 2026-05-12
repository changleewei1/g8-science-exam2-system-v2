-- 補齊 skill_tags 名稱：僅更新名稱為空白/NULL 的列，不覆蓋既有名稱

update public.skill_tags
set name = case code
  when 'EL01' then '電解質的基本概念'
  when 'EL02' then '電解質與非電解質判斷'
  when 'EL03' then '電解質導電原理'
  when 'EL04' then '電解質的實驗判斷'
  when 'EL05' then '強電解質與弱電解質'
  when 'EL06' then '電解質的生活應用'
  when 'AB01' then '酸的基本性質'
  when 'AB02' then '鹼的基本性質'
  when 'AB03' then '酸的生活應用與辨識'
  when 'AB04' then '鹼的生活應用與辨識'
  when 'AB05' then 'pH值與酸鹼判斷'
  when 'AB06' then '酸鹼安全與操作'
  when 'CO01' then '濃度的基本概念'
  when 'CO02' then '濃度比較與判斷'
  when 'CO03' then '濃度的定性判斷'
  when 'CO04' then '稀釋與濃度變化'
  when 'CO05' then '濃度的生活應用'
  when 'NE01' then '中和反應基本概念'
  when 'NE02' then '中和後溶液性質'
  when 'NE03' then '中和反應判斷'
  when 'NE04' then '中和與滴定概念'
  when 'NE05' then '中和的生活應用'
  else name
end
where code in (
  'EL01', 'EL02', 'EL03', 'EL04', 'EL05', 'EL06',
  'AB01', 'AB02', 'AB03', 'AB04', 'AB05', 'AB06',
  'CO01', 'CO02', 'CO03', 'CO04', 'CO05',
  'NE01', 'NE02', 'NE03', 'NE04', 'NE05'
)
and nullif(trim(name), '') is null;
