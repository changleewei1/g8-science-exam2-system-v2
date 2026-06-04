import { getSubjectConfig } from "@/config/subjectConfigs";
import type { SubjectServiceContext } from "@/lib/services/subject-context";

/** 段考範圍相關邏輯入口（漸進將 exam_scopes 查詢集中於此）。 */
export function examScopeDefaultTitle(ctx: SubjectServiceContext): string {
  return getSubjectConfig(ctx.subjectKey).defaultExamScopeTitle;
}
