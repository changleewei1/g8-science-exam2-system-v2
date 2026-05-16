-- 第三次段考：移除匯入／回填時寫入的 placeholder quiz_questions（真題改由 question_bank_items 同步）
delete from public.quiz_questions qq
using public.quizzes q, public.videos v, public.scope_units su
where qq.quiz_id = q.id
  and q.video_id = v.id
  and v.unit_id = su.id
  and su.exam_scope_id = 'b0000001-0000-4000-8000-000000000010'
  and (
    qq.question_text like '%請依據本影片內容選出最適當的答案%'
    or (
      qq.choice_a = '選項 A'
      and qq.choice_b = '選項 B'
      and qq.choice_c = '選項 C'
      and qq.choice_d = '選項 D'
    )
  );
