/** 若只設定一個段考，可於部署時設定此值供前端預設導向 */
export function getDefaultExamScopeId(): string | undefined {
  return process.env.NEXT_PUBLIC_DEFAULT_EXAM_SCOPE_ID;
}
