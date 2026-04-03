import { PostgrestError } from "@supabase/supabase-js";

/**
 * Supabase `.from().insert()` 等在失敗時回傳的 `error` 常為 **plain object**（非 `Error` 實例）。
 * 若直接 `throw error`，上層 `e instanceof Error` 會為 false，API 會誤回 `{ error: "UNKNOWN" }`。
 */
export function throwIfPostgrestError(
  error: {
    message?: string;
    details?: string | null;
    hint?: string | null;
    code?: string | null;
  } | null,
): asserts error is null {
  if (!error) return;
  throw new PostgrestError({
    message: error.message ?? "資料庫請求失敗",
    details: error.details == null ? "" : String(error.details),
    hint: error.hint == null ? "" : String(error.hint),
    code: error.code == null ? "" : String(error.code),
  });
}

/**
 * 將 Supabase / PostgREST 錯誤轉成可讀字串（供除錯與使用者提示）
 */
export function getSupabaseErrorMessage(error: unknown): string {
  if (error == null) return "未知錯誤";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const m = (error as { message: unknown }).message;
    if (typeof m === "string") return m;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/** Postgres / PostgREST 錯誤碼（若有的話） */
function getPostgresLikeCode(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    const c = (error as { code: unknown }).code;
    if (typeof c === "string") return c;
  }
  return null;
}

/**
 * 是否為「學習任務相關資料表尚未建立」。
 * 注意：不可僅用訊息是否包含表名——權限錯誤也會出現 learning_tasks，會誤判成「尚未初始化」。
 */
export function looksLikeMissingLearningTasksTable(error: unknown): boolean {
  const code = getPostgresLikeCode(error);
  // 42P01 = undefined_table；PostgREST 表不在 schema cache 時常見 PGRST205
  if (code === "42P01" || code === "PGRST205") return true;

  const msg = getSupabaseErrorMessage(error).toLowerCase();

  const namesLearningTaskTable =
    msg.includes("learning_tasks") || msg.includes("task_videos") || msg.includes("student_task_progress");

  if (namesLearningTaskTable && msg.includes("does not exist")) return true;

  if (
    namesLearningTaskTable &&
    (msg.includes("schema cache") || msg.includes("could not find the table"))
  ) {
    return true;
  }

  return false;
}

/**
 * 僅「指派名單」表不存在時為 true（未跑 20250404120000 migration）。
 * 權限錯誤不算，避免誤判成可空跑。
 */
export function looksLikeMissingLearningTaskAssigneesTable(error: unknown): boolean {
  const msg = getSupabaseErrorMessage(error).toLowerCase();
  if (msg.includes("permission denied")) return false;

  if (msg.includes("learning_task_assignees")) {
    if (msg.includes("does not exist")) return true;
    if (msg.includes("schema cache")) return true;
    if (msg.includes("could not find the table")) return true;
  }

  const code = getPostgresLikeCode(error);
  if (code === "42P01" || code === "PGRST205") {
    if (msg.includes("assignees") || msg.includes("learning_task_assignees")) return true;
  }

  return false;
}
