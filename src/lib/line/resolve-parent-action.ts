import type { PendingParentAction } from "@/lib/line-user-context/line-user-context-service";
import { normalizeLineInput } from "@/lib/line-user-context/parse-subject-input";

/** postback data 約定：`action=homework_status` 等（與 LINE Rich Menu 對齊） */

export type { PendingParentAction };

export const MSG_UNBOUND_FOR_FEATURE =
  "尚未完成綁定，請先輸入：我是702王小明的爸爸";

export const MSG_ASK_SUBJECT = "請輸入科目，例如：理化";

export const MSG_MULTI_STUDENT_NEED_PAIR =
  "偵測到您綁定多位學生，請輸入：學生姓名 科目，例如：王小明 理化";

export const MSG_NEED_SELECT_FEATURE_FIRST =
  "請先選擇查詢功能，例如：回家功課、學習成績、學習影片推薦";

export const MSG_CONTEXT_EXPIRED =
  "查詢已逾時，請重新點選功能按鈕";

export const MSG_SUBJECT_NOT_SUPPORTED = "目前尚未提供此科目查詢";

export const MSG_SUBJECT_UNRECOGNIZED =
  "無法辨識科目，請輸入：理化、數學、或英文";

export const MSG_STUDENT_NOT_IN_BINDINGS =
  "找不到與您綁定資料相符的學生姓名，請確認後再試。";

export const MSG_STUDENT_AMBIGUOUS =
  "資料重複或無法判斷學生，請聯絡老師。";

/** 文字入口 ↔ `pending_action`（同義詞僅在此維護） */
const TEXT_ENTRY: { action: PendingParentAction; phrases: string[] }[] = [
  {
    action: "homework_status",
    phrases: ["回家功課", "完成度"],
  },
  {
    action: "learning_performance",
    phrases: ["學習成績", "學習表現"],
  },
  {
    action: "video_recommendation",
    phrases: ["學習影片推薦"],
  },
];

function normalizeForMatch(s: string): string {
  return normalizeLineInput(s);
}

/**
 * 若使用者文字為查詢功能入口，回傳對應 `pending_action`；否則 null。
 */
export function matchTextEntryToAction(raw: string): PendingParentAction | null {
  const n = normalizeForMatch(raw);
  for (const entry of TEXT_ENTRY) {
    for (const p of entry.phrases) {
      if (n === normalizeForMatch(p)) {
        return entry.action;
      }
    }
  }
  return null;
}

/**
 * 解析 LINE postback `data`（`action=…`）；不認得則 null。
 */
export function parsePostbackToPendingAction(
  data: string | undefined | null,
): PendingParentAction | null {
  if (data == null || data === "") return null;
  let payload = data;
  try {
    if (data.trim().startsWith("{")) {
      const j = JSON.parse(data) as { action?: string };
      if (j?.action) payload = `action=${j.action}`;
    }
  } catch {
    /* 非 JSON，沿用字串 */
  }
  const sp = new URLSearchParams(payload.includes("=") ? payload : `action=${payload}`);
  const action = sp.get("action")?.trim();
  switch (action) {
    case "homework_status":
      return "homework_status";
    case "learning_performance":
      return "learning_performance";
    case "video_recommendation":
      return "video_recommendation";
    default:
      return null;
  }
}
