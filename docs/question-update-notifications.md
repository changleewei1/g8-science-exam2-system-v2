# 題目更新通知系統（實作說明）

## 1. 新增哪些 tables

| 資料表 | 說明 |
|--------|------|
| `question_bank_item_revisions` | 每次題庫題**升版**寫入一筆：版本區間、`change_reason`、`edited_at`、`editor_label`（預留）。 |
| `question_update_notifications` | 每位學生、每題、每個**新版本**一筆；`is_read` 供學生端／導覽列統計。 |

`question_bank_items` 新增欄位：`version`（預設 1）、`change_reason`、`updated_at`。

Migration：`supabase/migrations/20260529140000_question_update_notifications.sql`。

## 2. 新增哪些 API

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/api/student/question-updates` | `unreadCount` + `updates` 列表。 |
| POST | `/api/student/question-updates/read` | 已讀：`notificationIds` / `questionIds` / `videoId` 擇一或多。 |
| GET | `/api/admin/question-bank` | 題庫列表（預設僅 `video_id` 不為 null）。 |
| GET | `/api/admin/question-bank/[questionId]/revisions` | 該題版本歷史。 |

`GET /api/student/tasks/summary` 回傳新增 **`unreadQuestionUpdateCount`**。

## 3. Dashboard 修改內容

- `buildStudentFocusHomePayload`：若有未讀通知，帶入 **`questionUpdate`**（未讀數、`practiceHref`）。
- `StudentFocusHome`：在「本週任務」區塊**下方**新增 **🆕 題目已更新** 卡片（橘色 glow）、**立即複習** 按鈕。

## 4. Task Page 修改內容

- Server 載入 `fetchStudentQuestionUpdateNotifications` 傳入 `LearningTasksPageView`。
- 新增 **題目已更新** 專區（`#question-updates` 錨點）：影片名、原／目前版本、更新時間、原因、**重新挑戰**（導向該片測驗或影片頁）。

## 5. 家長摘要新增內容

- `ParentDailyEmailReportData` 新增 `questionUpdateUnreadCount`、`questionUpdateVideoTitles`。
- `renderParentDailyEmailHtml`：區塊 **🆕 題目更新提醒**（受 `parentSectionVisibility.question_updates` 控制；預設與其他區塊一併開啟）。
- `PARENT_EMAIL_SECTION_KEYS` 新增 **`question_updates`**。

## 6. Notification 流程圖（文字）

```
老師更新 question_bank_items 內容（或測驗編輯同步至題庫）
    → BEFORE UPDATE：內容有變則 version+1、updated_at、補預設 change_reason
    → AFTER UPDATE：寫入 question_bank_item_revisions
                 → 查曾作答該題（quiz_questions.question_bank_item_id + 已提交 attempt）
                 → UNION 曾完成該片測驗的學生（同 video_id + 已提交 attempt）
                 → INSERT question_update_notifications（去重 unique）

學生登入 → 首頁／任務頁／導覽列顯示未讀數
    → 點「重新挑戰」進入影片測驗
    → POST /api/quizzes/[quizId]/submit 成功後
          → 將該測驗關聯題庫題之通知標為 is_read=true
```

## 7. 哪些情況會自動建立通知

- **`question_bank_items` 的題幹／選項／正解／詳解**任一欄位變更導致 **version 遞增** 時（資料庫 trigger）。
- 受影響學生來源：
  1. 曾對該 **`question_bank_item_id`** 之 `quiz_questions` 作答且 **attempt 已提交**；
  2. 或曾對該 **`video_id`** 之影片測驗 **提交過**（不限是否同一 bank 題）。

老師在 **影片測驗編輯** 儲存時，若該列有 `question_bank_item_id`，會**同步更新題庫列**並觸發上述流程（可選 `changeReason`）。
