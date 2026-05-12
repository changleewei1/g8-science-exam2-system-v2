-- 補齊反應速率技能名稱（RS01–RS11）
-- 規則：僅當 name 為空，或 name 等於 code（如 RS06）時才更新，不覆蓋既有自訂名稱

update public.skill_tags
set name = case code
  when 'RS01' then '反應速率的意義'
  when 'RS02' then '影響反應速率的因素'
  when 'RS03' then '溫度對反應速率的影響'
  when 'RS04' then '濃度對反應速率的影響'
  when 'RS05' then '比較反應快慢'
  when 'RS06' then '控制變因的判斷'
  when 'RS07' then '生活中的反應速率'
  when 'RS08' then '反應速率的定量比較'
  when 'RS09' then '平均反應速率計算'
  when 'RS10' then '反應速率圖表判讀'
  when 'RS11' then '條件改變下的速率比較'
  else name
end
where code in (
  'RS01', 'RS02', 'RS03', 'RS04', 'RS05', 'RS06',
  'RS07', 'RS08', 'RS09', 'RS10', 'RS11'
)
and (
  nullif(trim(name), '') is null
  or trim(name) = code
);
