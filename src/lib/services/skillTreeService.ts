import { getSubjectConfig } from "@/config/subjectConfigs";
import type { SubjectServiceContext } from "@/lib/services/subject-context";

export function skillCodeBelongsToSubject(skillCode: string, ctx: SubjectServiceContext): boolean {
  const prefixes = getSubjectConfig(ctx.subjectKey).skillCodePrefix;
  const sc = skillCode.trim();
  return prefixes.some((p) => sc.startsWith(p));
}
