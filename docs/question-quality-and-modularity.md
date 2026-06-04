# 題目品質回饋與系統模組化（實作摘要）

本文回應產品需求中的「完成後回報」八項要點，並標註與程式／資料庫的對應位置。

---

## 1. 題目回饋功能新增哪些 table

| 資料表 | 說明 |
|--------|------|
| `question_feedback` | 每位學生對每題（`question_bank_items.id`）至多一筆回饋；欄位含 `feedback_type`、`comment`、`video_id`、`student_id`、`exam_scope_id` 等。 |
| `question_quality_stats` | 依回饋聚合的計數、`quality_score`、`review_status`；由函式 `update_question_quality_score` 維護。 |
| `quiz_questions.question_bank_item_id` | 選填 FK，將影片測驗列與題庫題連結，供學生端在結果頁送出回饋。 |

Migration：`supabase/migrations/20260528130000_question_quality_feedback.sql`。

---

## 2. 學生如何回饋題目

1. 學生完成影片下方三題測驗後，進入**測驗結果頁**（含詳解）。
2. 每題在詳解下方顯示元件 `QuizQuestionQualityFeedback`（`src/components/student/quiz/QuizQuestionQualityFeedback.tsx`）。
3. 文案：「這題是否符合影片內容？」可選：**符合／不符合／看不懂／答案可能有錯／詳解可能有錯**，並可選填簡短說明。
4. 送出 `POST /api/student/question-feedback`（`src/app/api/student/question-feedback/route.ts`），成功後顯示感謝訊息。

---

## 3. 題目品質分數如何計算

由資料庫函式 **`public.update_question_quality_score(p_question_id uuid)`** 依 `question_feedback` 全量重算：

- 各類型**加權加總**後：`quality_score = clamp(0, 100, 100 + sum(權重))`  
- 權重：`helpful +2`、`not_related -20`、`confusing -10`、`wrong_answer -30`、`bad_explanation -15`  
- 計數欄位為各 `feedback_type` 的筆數。

前端／共用常數說明：`src/lib/services/questionQualityService.ts`（與 DB 一致）。

---

## 4. 老師如何審核有問題的題目

1. 後台進入 **`/admin/question-feedback`**（`src/app/admin/question-feedback/page.tsx`）。
2. 列表資料來自 **`GET /api/admin/question-feedback`**，可依 `review_status`、曾收到「不符合影片」或「答案可能有錯」篩選，並顯示近期學生留言。
3. 老師可 **`PATCH /api/admin/question-feedback/[questionId]`** 更新 `review_status`：`normal` | `needs_review` | `hidden` | `approved`（已核准時，若再由回饋觸發重算，DB 會盡量保留 `approved`）。
4. **編輯題幹／選項／答案／詳解**：請透過既有「影片測驗題編輯」或題庫／候選題流程；本頁提供所屬影片連結至 `video-tracking` 以利追查。
5. **`POST .../regenerate`**：目前回傳 **501**，預留未來帶入字幕、技能與學生回饋後重新產生候選題。

---

## 5. 哪些題目會被自動隱藏

依 **`update_question_quality_score`** 規則：

- **`quality_score < 50`** → `review_status = hidden`（學生端影片測驗抽題會排除）。
- **`quality_score < 70`**，或 **`not_related` 次數 ≥ 2**，或 **`wrong_answer` 次數 ≥ 2** → `review_status = needs_review`（需老師處理；抽題邏輯仍可能抽到，除非另行加上排除規則）。

影片測驗同步抽題（`src/lib/admin/sync-video-quiz-from-bank.ts`）另外排除：`review_status = hidden`、`quality_score < 50`、placeholder、已標 `excluded_from_video_quiz_pool`。

---

## 6. 系統目前哪些地方仍寫死國二理化

非完整清單，常見處包括：

- **Cookie／工作階段**：`src/lib/session.ts`、`src/proxy.ts`（命名含 `g8_science_exam2`）。
- **技能樹資料**：`src/lib/student-skill-tree.ts` 引用 `g8_science_exam3_skill_tree.json`。
- **段考／種子／報表文案**：`src/lib/exam3-scope.ts`、`src/lib/report/buildDailyOverviewPayload.ts`、`src/lib/admin/video-ai.ts`、多處 UI 字串「國二理化」。
- **報表設定常數**：`src/lib/admin/teacher-report-preferences.ts` 的 `REPORT_SCOPE_G8_SCIENCE`。

已新增 **`src/config/subjectConfigs.ts`** 與 **`src/lib/services/*`** 作為模組邊界與 `subjectKey` 入口，新功能應優先讀設定而非硬編科目名稱。

---

## 7. 已整理出哪些核心模組

對應需求中的七大模組，在 `src/lib/services/` 建立**邊界檔與 re-export**（實作仍漸進遷移至各既有 route／domain）：

| 模組 | 檔案 |
|------|------|
| ExamScope | `examScopeService.ts` |
| VideoLearning | `videoLearningService.ts` |
| SkillTree | `skillTreeService.ts` |
| QuestionGeneration | `questionGenerationService.ts` |
| AdaptivePractice | `adaptivePracticeService.ts` |
| LearningTask | `learningTaskService.ts` |
| Reporting | `reportingService.ts` |
| 題目品質（補充） | `questionQualityService.ts` |

匯出入口：`src/lib/services/index.ts`。

---

## 8. 未來套用到其他科目需要哪些資料

- **科目設定**：在 `subjectConfigs.ts` 新增 `subjectKey`（例如 `g8_math`）、顯示名稱、`skillCodePrefix`、`enabledModules`、預設段考標題等。
- **段考範圍**：`exam_scopes` 與各內容的 `exam_scope_id`（影片、題庫、任務、報表範圍）需可依科目區分。
- **技能樹與前綴**：每科獨立的 skill 定義與 JSON／DB 來源；可用 `skillCodePrefix` 做粗篩。
- **影片與題庫**：`videos`、`question_bank_items`、`video_skill_tags` 等需帶正確 `exam_scope_id`／`video_id`／`skill_code`。
- **學生／老師脈絡**：Cookie 或 session 建議改為含 `subjectKey` 或多租戶欄位；路由可漸進改為 `/student/[subjectKey]/...`。
- **AI 提示詞**：`video-ai` 等處改為讀 `getSubjectConfig(subjectKey)` 的科目敘述，避免寫死「國二理化」。

---

## API 一覽（題目品質）

| 方法 | 路徑 | 說明 |
|------|------|------|
| POST | `/api/student/question-feedback` | 學生送出回饋。 |
| GET | `/api/admin/question-feedback` | 老師列表（含題文摘要、篩選、近期留言）。 |
| PATCH | `/api/admin/question-feedback/[questionId]` | 更新 `review_status`。 |
| POST | `/api/admin/question-feedback/[questionId]/regenerate` | 預留，目前 501。 |
