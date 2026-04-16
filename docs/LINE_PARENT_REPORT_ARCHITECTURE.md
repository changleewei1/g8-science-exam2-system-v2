# LINE 家長學習報告 — 系統架構規劃

本文件描述在既有 **Next.js + Supabase + 學習診斷／報告** 之上，擴充 **LINE Messaging API + Flex Message + 排程發送** 的完整設計。實作時應重用 `StudentReportService.buildReport(..., audience: "parent")` 等既有邏輯，避免重複計算。

---

## 一、與現有系統的關係

| 既有資源 | 用途 |
|-----------|------|
| `students` | 學生基本資料 |
| `student_video_progress`、`student_quiz_attempts`、`student_quiz_answers` | 完成度、正確率 |
| `StudentReportService` → `StudentReportDto` | 雷達、單元長條、弱點、推薦影片、文字摘要 |
| `learning_tasks`、`task_videos`、`student_task_progress` | 任務範圍與甘特（若報告需限定任務） |
| 管理員 Session | 後台權限（沿用現有 admin cookie） |

**新增**：家長 LINE 綁定、發送紀錄、排程設定；**不**取代現有報告頁，而是多一條「推播到 LINE」管道。

---

## 二、資料表設計（Supabase Migration）

### 2.1 `parent_line_subscribers`（家長 LINE 訂閱／綁定）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | |
| `student_id` | uuid FK → students | 一位學生可對應多位家長時：多筆同 `student_id` 不同 `line_user_id` |
| `line_user_id` | text UNIQUE NOT NULL | LINE UserId（U…） |
| `display_name` | text nullable | LINE 顯示名（選填，Webhook follow 時寫入） |
| `status` | text | `active` / `blocked` / `pending`（使用者封鎖 Bot 後可標 blocked） |
| `bound_at` | timestamptz | 綁定時間 |
| `created_at` | timestamptz | |

索引：`(student_id)`, `(line_user_id)`。

### 2.2 `line_message_send_logs`（發送紀錄）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | |
| `subscriber_id` | uuid FK → parent_line_subscribers nullable | 手動輸入 userId 測試時可空 |
| `student_id` | uuid FK | 報告主體學生 |
| `send_type` | text | `manual_single` / `manual_bulk` / `schedule_daily` / `schedule_weekly` |
| `schedule_run_id` | uuid nullable | 若由排程觸發，可連到排程執行紀錄 |
| `status` | text | `pending` / `success` / `failed` |
| `line_request_id` | text nullable | LINE API response 之 x-line-request-id（除錯） |
| `error_code` | text nullable | 例如 `429`, `400` |
| `error_message` | text nullable | API 回傳 body 摘要或自訂說明 |
| `flex_message_json` | jsonb nullable | 實際送出的 Flex（除錯／審核，可設保留天數） |
| `sent_at` | timestamptz nullable | 成功送出時間 |
| `created_at` | timestamptz | 建立時間 |

索引：`(student_id, created_at desc)`, `(status)`。

### 2.3 `line_broadcast_schedules`（排程設定）

| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | uuid PK | |
| `name` | text | 例如「每日 20:00 全班」 |
| `cron_expression` | text | 或簡化：`frequency` enum + `time_local` + `weekday`（建議先用簡化欄位降低錯誤） |
| `frequency` | text | `daily` / `weekly` |
| `time_utc` | time | 建議存 UTC，前端換算顯示；或存 `Asia/Taipei` 字串 + `time_local` |
| `weekday` | int nullable | 0–6，`weekly` 用 |
| `target_scope` | text | `single_student` / `class` / `exam_scope` |
| `target_student_id` | uuid nullable | |
| `target_class_name` | text nullable | 對應 `students.class_name` |
| `exam_scope_id` | uuid nullable | 報告範圍 |
| `task_id` | uuid nullable | 與報告一致 |
| `is_active` | boolean | |
| `last_run_at` | timestamptz nullable | |
| `next_run_at` | timestamptz nullable | 選填，由 cron 計算 |
| `created_at` | timestamptz | |

### 2.4 `line_schedule_runs`（排程執行批次，選填）

| 欄位 | 說明 |
|------|------|
| `id`, `schedule_id`, `started_at`, `finished_at`, `students_total`, `success_count`, `fail_count`, `error_summary` | 方便後台「最近一次排程結果」 |

---

## 三、API Routes 設計（`src/app/api/`）

| 路徑 | 方法 | 用途 |
|------|------|------|
| `/api/line/webhook` | POST | LINE Webhook：驗證 signature、處理 follow/unfollow/message（綁定流程可在此用 LIFF 或連結帶 token） |
| `/api/admin/parent-line/subscribers` | GET | 列表（分頁、搜尋學生／class） |
| `/api/admin/parent-line/subscribers` | POST | 手動新增綁定（admin 輸入 line_user_id + student_id） |
| `/api/admin/parent-line/subscribers/[id]` | PATCH / DELETE | 更新狀態、解除綁定 |
| `/api/admin/parent-line/send` | POST | body: `{ studentId, subscriberId?, examScopeId?, taskId? }` 單一發送 |
| `/api/admin/parent-line/send-bulk` | POST | body: `{ className? \| studentIds[], examScopeId?, taskId? }` 全班／批次 |
| `/api/admin/parent-line/logs` | GET | 發送紀錄列表（篩選 status、日期） |
| `/api/admin/parent-line/schedules` | GET / POST | 排程 CRUD |
| `/api/admin/parent-line/schedules/[id]` | PATCH / DELETE | |
| `/api/cron/parent-line-digest` | GET 或 POST | **僅**允許 Vercel Cron 或 `Authorization: Bearer CRON_SECRET`；內部讀取 `is_active` 排程、計算應發送對象、呼叫發送服務 |

**安全**：Webhook 用 `LINE_CHANNEL_SECRET` 驗簽；cron 用 `CRON_SECRET`；admin routes 用既有 `getAdminSession()`。

---

## 四、LINE Flex Message 模板結構（JSON 邏輯層）

建議 **bubble 高度可控**：一則 Flex 含 **hero（可選）** + **body** + **footer（按鈕）**。

### 4.1 區塊建議

1. **Header**：學生姓名、班級、報告日期（`StudentReportDto.generatedAt`）
2. **Body**（vertical）  
   - 摘要文字 1～2 段（`summary.paragraphs` 取前兩段或截斷）  
   - **指標列**：影片完成率、測驗通過率（`summary` 內既有）  
   - **弱點**：`weakSkills` 前 3 筆，顯示技能名 + 正確率  
   - **本週／任務進度**（若有 `gantt` 可簡化為一行統計）
3. **Footer**（buttons）  
   - URI：`https://{APP_URL}/report/...` 或使用既有 **student_report_tokens** 產生家長連結（若專案已有公開報告頁）  
   - 推薦影片：第一則 `suggestedVideos[0]` 連到站内影片頁或 YouTube（依現有路由）

### 4.2 實作位置

- `src/lib/line/flex/build-parent-report-flex.ts`：輸入 `StudentReportDto` + `appBaseUrl`，輸出 `FlexContainer`（型別可自訂或 `Record<string, unknown>`）。
- LINE 限制：bubble 大小、字數；長文用 `wrap: true` + 截斷（例如 120 字）。

---

## 五、後台頁面規劃（`/admin/parent-line/`）

| 路徑 | 內容 |
|------|------|
| `/admin/parent-line` | 儀表：今日發送成功/失敗、最近錯誤 |
| `/admin/parent-line/subscribers` | 家長綁定表：學生、LINE userId、狀態、操作 |
| `/admin/parent-line/send` | 選學生／班級 → 預覽 Flex（JSON 或 LINE Simulator）→ 發送 |
| `/admin/parent-line/logs` | 發送紀錄：時間、學生、狀態、錯誤訊息、request id |
| `/admin/parent-line/schedules` | 排程列表：新增/編輯頻率、時間、範圍、啟用 |

側邊選單或 `admin` 首頁加連結至「家長 LINE」。

---

## 六、排程發送機制

| 方案 | 說明 |
|------|------|
| **Vercel Cron** | `vercel.json` 設定每日觸發 `GET /api/cron/parent-line-digest`；handler 內查詢所有 `is_active` 排程，比對「現在是否應執行」（時區用 `Asia/Taipei`）。 |
| **精確度** | Serverless 冷啟動可能延遲 1～2 分鐘；若需精準到分，可接受或改 **外部 cron**（GitHub Actions / Cloud Scheduler）打同一 API。 |

流程：Cron → 讀 schedules → 解析 target（單人／全班）→ 對每位學生找 `parent_line_subscribers` active → `buildReport` → `pushFlex` → 寫入 `line_message_send_logs`。

---

## 七、環境變數設計

| 變數 | 用途 |
|------|------|
| `LINE_CHANNEL_ACCESS_TOKEN` | Messaging API 發送訊息 |
| `LINE_CHANNEL_SECRET` | Webhook 簽章驗證 |
| `CRON_SECRET` | 保護 `/api/cron/*` |
| `NEXT_PUBLIC_APP_URL` 或 `APP_BASE_URL` | Flex 內按鈕連結、報告頁（已於 DEPLOY 提及） |

`.env.example` 需補上以上欄位說明。

---

## 八、建議新增／修改的檔案與用途（實作階段）

| 路徑 | 用途 |
|------|------|
| `supabase/migrations/YYYYMMDD_line_parent_messaging.sql` | 建立上列新表與 RLS（若需） |
| `src/lib/line/verify-signature.ts` | Webhook raw body + HMAC |
| `src/lib/line/push-message.ts` | 呼叫 `https://api.line.me/v2/bot/message/push` |
| `src/lib/line/flex/build-parent-report-flex.ts` | DTO → Flex JSON |
| `src/domain/services/parent-line-send-service.ts` | 組裝報告、寫 log、呼叫 push |
| `src/app/api/line/webhook/route.ts` | LINE 事件入口 |
| `src/app/api/admin/parent-line/**` | 管理 API |
| `src/app/api/cron/parent-line-digest/route.ts` | 排程入口 |
| `src/app/admin/parent-line/**/page.tsx` | 後台 UI |
| `vercel.json` | `crons` 設定（若使用 Vercel） |

---

## 九、實作順序建議

1. Migration + 型別（`database.ts`）  
2. `push-message` + `build-parent-report-flex`（單元測試或手動 script 測 Flex）  
3. `ParentLineSendService` + `POST /api/admin/parent-line/send`（手動單發 + log）  
4. 後台 subscribers + logs 頁  
5. Webhook（綁定流程可第二階段：先用後台手動綁定 userId）  
6. `send-bulk` + schedules 表 + cron route  
7. Vercel Cron + 排程 UI  

---

## 十、風險與合規

- **個資**：家長 LINE ID 屬個資，RLS 僅 service role 寫入；後台僅管理員。  
- **LINE 配額**：免費方案有 push 則數，大量全班需評估。  
- **使用者封鎖**：發送失敗時記 `error_message`，並將 subscriber 標為 `blocked`（依 API 錯誤碼判斷）。

---

本規劃確認後，可依「九、實作順序」逐步提交 PR／commit 產生程式碼。
