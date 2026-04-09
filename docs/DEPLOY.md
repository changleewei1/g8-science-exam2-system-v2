# 國二理化段考系統 — 資料上傳與部署

本專案為 Next.js + Supabase。部署到線上（例如 Vercel）與寫入題庫**分開處理**：程式碼走 Git／Vercel；資料走 Supabase（migration、seed、或後台編輯）。

## 一、本機前置

1. 複製環境變數：`cp .env.example .env.local`，填入 Supabase、`SESSION_SECRET`、`ADMIN_DASHBOARD_SECRET` 等（見 `.env.example`）。
2. 確認可建置：`npm install && npm run build`。

## 二、資料庫結構（Supabase）

在 Supabase Dashboard **SQL Editor** 依序執行 `supabase/migrations/` 內 migration（由舊到新），或使用 Supabase CLI：

```bash
# 若已將本 repo 連結至 Supabase 專案
npx supabase db push
```

（若未用 CLI，請手動貼上 migration 內容執行，避免漏執行 `20260409120000_reaction_rate_question_tools.sql` 等較新的檔案。）

## 三、種子與題庫資料（本機執行、連線遠端 DB）

以下指令皆在**專案根目錄**、且需有效的 `.env.local`（含 `NEXT_PUBLIC_SUPABASE_URL` 與 **`SUPABASE_SERVICE_ROLE_KEY`**）。

| 目的 | 指令 |
|------|------|
| 將 `data/g8_science_exam2_question_bank.json` 寫入 `question_bank_items` | `npm run seed:g8-question-bank` |
| 從 YouTube 匯入影片／測驗（需 `YOUTUBE_API_KEY`） | `npm run import:playlists` |
| 依 `video_skill_tags` 從題庫為每支影片配 3 題到小考 | `npm run seed:g8-video-quiz` |
| 匯出反應速率審核用 JSON | `npm run export:reaction-rate-review` |
| 依 `data/reaction_rate_question_review.json` 回寫題庫／小考（見腳本註解與 `--apply-*`） | `npm run sync:reaction-rate-review` |

**建議順序（新環境）**：migration → `seed:g8-question-bank` → `import:playlists`（若需影片）→ `seed:g8-video-quiz`。

## 四、不改指令、直接在線上改影片小考題

後台已提供編輯頁（需管理員登入）：

- 路徑：`/admin/video-quizzes` → 選測驗 → 編輯  
- 或直接：`/admin/video-quizzes/edit/[quizId]`  

可修改題幹、選項、正解、詳解、`skill_code`、圖片欄位等（即寫入 `quiz_questions`）。

## 五、部署 Next.js（Vercel 為例）

1. 將本 repo 推送到 GitHub／GitLab 等。
2. 在 [Vercel](https://vercel.com) **New Project** → Import 該 repo，Framework Preset 選 Next.js，Root Directory 選本專案。
3. **Environment Variables**：對照 `.env.example`，至少設定：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（**勿**勾選 Expose to Client）
   - `SESSION_SECRET`
   - `ADMIN_DASHBOARD_SECRET`
   - 選填：`NEXT_PUBLIC_DEFAULT_EXAM_SCOPE_ID`
   - 選填：`NEXT_PUBLIC_APP_URL` 或 `APP_BASE_URL`（正式網址含 `https://`，供分享連結）
4. Deploy。之後每次 push 到連線分支會自動重建。

## 六、常見注意

- **Service Role** 僅能放在伺服器端環境變數；不可出現在前端 bundle。
- 學生已作答的紀錄連到 `quiz_questions.id`；大量改題可能造成歷史試卷語意與現題不一致，重要變更前請自行備份或公告。
- `YOUTUBE_API_KEY` 僅本機匯入播放清單需要，Vercel 上若不再匯入可不設。
