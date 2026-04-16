# LINE Webhook（家長綁定／學習狀況）— 本機測試步驟

## 前置條件

1. **Supabase**：已套用 migration  
   `20260414120000_line_parent_subscribers.sql`（`parent_line_subscribers`、`line_message_send_logs`）、  
   `20260415120000_line_user_contexts.sql`（`line_user_contexts` 對話狀態）。
2. **環境變數**（`.env.local`）：
   - `NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
   - `LINE_CHANNEL_SECRET`、`LINE_CHANNEL_ACCESS_TOKEN`（LINE Developers → Messaging API）
   - 選填：`APP_BASE_URL` 或 `NEXT_PUBLIC_APP_URL`（產生「完整報告」連結用）
   - 本機略過驗簽：`LINE_WEBHOOK_SKIP_VERIFY=true`（**僅在非 `NODE_ENV=production` 時生效**；正式部署勿設定）

## 啟動本機與公開 URL

1. 執行 `npm run dev`（預設 `http://localhost:3000`）。
2. 使用 **ngrok**（或同類工具）將本機對外：`ngrok http 3000`。
3. 複製 ngrok 提供的 **HTTPS** 網址，例如 `https://xxxx.ngrok-free.app`。

## LINE Developers 設定

1. 登入 [LINE Developers](https://developers.line.biz/) → 選擇 Provider / Channel（Messaging API）。
2. **Webhook settings**：
   - Webhook URL：`https://<你的-ngrok-網域>/api/line/webhook`
   - 開啟 **Use webhook**。
3. 若本機**未**設 `LINE_WEBHOOK_SKIP_VERIFY=true`，須正確設定 `LINE_CHANNEL_SECRET`，否則驗簽失敗會回 `400`。

## 驗證流程

1. **綁定**：在 LINE 對話輸入  
   `我是702王小明的爸爸` 或 `我是702王小明的媽媽`  
   （班級、姓名須與資料庫 `students` 一致；班級會經正規化後比對。）
2. **預期**：回覆「綁定成功…」或依規則回覆（找不到／資料重複／已兩位家長等）。
3. **查詢**：輸入 `小朋友學習狀況`。
4. **預期**：收到 Flex 訊息；「開啟完整報告」需 `APP_BASE_URL`／`NEXT_PUBLIC_APP_URL` 或請求可推斷之公開網址，否則會退回以本機預設或手動拼接之 URL。

### 家長查詢（按鈕／文字入口 + 科目）

1. **文字入口**（與 Rich Menu `postback` 行為一致；按鈕請在 LINE 後台設 `data` 為 `action=homework_status`、`action=learning_performance`、`action=video_recommendation`）  
   - 輸入：`回家功課` 或 `完成度` → 應回「請輸入科目…」  
   - 輸入：`學習成績` 或 `學習表現` → 同上  
   - 輸入：`學習影片推薦` → 同上  
2. 接著輸入科目 **`理化`** → 應回對應類型內容（回家功課為文字；成績為 Flex；推薦影片為 Flex 或「暫無推薦」文字）。  
3. 輸入 **`數學`** 或 **`英文`** →「目前尚未提供此科目查詢」（並結束 context）。  
4. **未先選功能只輸入「理化」** →「請先選擇查詢功能…」。  
5. **Context 逾時**：約 15 分鐘後再輸入科目 →「查詢已逾時…」（可在 DB 手動把 `expires_at` 改為過去以加速測試）。  
6. **未綁定**：任一入口均應先回「尚未完成綁定，請先輸入：我是702王小明的爸爸」。  
7. **多位綁定**：若同一 LINE 綁定兩位以上學生，僅輸入科目會提示「請輸入：學生姓名 科目」；輸入 `王小明 理化` 應能對齊姓名後查詢。

### Rich Menu 接入注意

- 三個按鈕請使用 **postback**，`data` 格式見上；Webhook 已支援 `postback` 事件。  
- 影片推薦 Flex **不附「立即觀看」按鈕**：`/student/video/[videoId]` 需學生登入，家長無可靠公開連結；日若有家長可開之 URL 再於 `build-video-recommendation-flex.ts` 擴充。

## 除錯

- **400 Bad Request**：多為驗簽失敗；確認 `LINE_CHANNEL_SECRET` 與 Channel 一致，或本機暫用 `LINE_WEBHOOK_SKIP_VERIFY=true`。
- **無法寫入 DB**：確認 `SUPABASE_SERVICE_ROLE_KEY` 與 migration 已套用。
- **查無學生**：確認 `students.class_name` 經 `normalizeClassName` 後與輸入班級一致（去空白、全形數字轉半形、去「班」）。

## 正式部署注意

- 請勿將 `LINE_WEBHOOK_SKIP_VERIFY` 設為 `true`。
- 程式在 `NODE_ENV=production` 時**一律**驗簽；略過驗簽僅在非 production 且 `LINE_WEBHOOK_SKIP_VERIFY=true` 時生效。
