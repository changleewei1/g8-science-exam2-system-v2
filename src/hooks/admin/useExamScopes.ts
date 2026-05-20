"use client";

import type { ExamScopeLike } from "@/lib/admin/learning-scope";

/**
 * 依班級整理可切換的段考範圍（目前與班級無關，預留未來依班級過濾）。
 */
export function useExamScopes(_classId: string | undefined, scopes: ExamScopeLike[]) {
  return scopes;
}
