import type { ExamScope } from "@/domain/entities";

const G8_GRADE = 8;

/** 下學期第二次段考（正式）：優先 grade/term/exam_no，其次 title／環境變數 */
export function resolveSpringSecondExamScope(
  scopes: ExamScope[],
  envDefaultScopeId: string | undefined,
): ExamScope | null {
  const g8 = scopes.filter((s) => s.grade === G8_GRADE);
  const byMeta = g8.find((s) => s.term === 2 && s.examNo === 2);
  if (byMeta) return byMeta;

  if (envDefaultScopeId) {
    const byEnv = g8.find((s) => s.id === envDefaultScopeId);
    if (byEnv) return byEnv;
  }

  const t = (s: ExamScope) => `${s.title} ${s.description ?? ""}`;
  return (
    g8.find((s) => {
      const u = t(s);
      return u.includes("第二次段考") || (u.includes("下學期") && u.includes("第二次"));
    }) ?? null
  );
}

/** 下學期第三次段考：優先 grade/term/exam_no，其次 title */
export function resolveSpringThirdExamScope(scopes: ExamScope[]): ExamScope | null {
  const g8 = scopes.filter((s) => s.grade === G8_GRADE);
  const byMeta = g8.find((s) => s.term === 2 && s.examNo === 3);
  if (byMeta) return byMeta;

  return (
    g8.find((s) => {
      const u = `${s.title} ${s.description ?? ""}`;
      return u.includes("第三次段考") || u.includes("下學期第三次");
    }) ?? null
  );
}
