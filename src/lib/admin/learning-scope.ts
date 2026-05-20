/** 段考範圍（對應 exam_scopes，供篩選解析用） */
export type ExamScopeLike = {
  id: string;
  subject: string;
  grade: number;
  term: number;
  examNo: number;
  title: string;
  isActive: boolean;
};

/** 後台學習總覽篩選（預留未來 API 查詢參數） */
export type LearningScope = {
  academicYear: string;
  grade: string;
  subject: string;
  exam: string;
  classId: string;
  keyword: string;
};

export const ACADEMIC_YEAR_OPTIONS = ["114學年度", "115學年度"] as const;
export const GRADE_OPTIONS = ["國一", "國二", "國三"] as const;
export const SUBJECT_OPTIONS = ["理化", "數學"] as const;
export const EXAM_OPTIONS = ["第一次段考", "第二次段考", "第三次段考"] as const;
export const CLASS_OPTIONS = [
  { value: "all", label: "全部班級" },
  { value: "801", label: "801班" },
  { value: "802", label: "802班" },
  { value: "803", label: "803班" },
] as const;

export const DEFAULT_LEARNING_SCOPE: LearningScope = {
  academicYear: "114學年度",
  grade: "國二",
  subject: "理化",
  exam: "第三次段考",
  classId: "all",
  keyword: "",
};

export function gradeLabelToNumber(grade: string): number | null {
  if (grade === "國一") return 7;
  if (grade === "國二") return 8;
  if (grade === "國三") return 9;
  return null;
}

export function examLabelToNumber(exam: string): number | null {
  if (exam === "第一次段考") return 1;
  if (exam === "第二次段考") return 2;
  if (exam === "第三次段考") return 3;
  return null;
}

function subjectMatches(scopeSubject: string, filterSubject: string): boolean {
  const s = scopeSubject.toLowerCase();
  if (filterSubject === "理化") {
    return s.includes("理化") || s.includes("自然");
  }
  if (filterSubject === "數學") {
    return s.includes("數學");
  }
  return true;
}

/**
 * 依年級／科目／段考對應 exam_scopes（學年度目前僅顯示於 UI，待 DB 擴充後再接查詢）。
 */
export function resolveExamScopeFromLearningScope(
  scopes: ExamScopeLike[],
  filter: LearningScope,
): ExamScopeLike | null {
  const gradeNum = gradeLabelToNumber(filter.grade);
  const examNo = examLabelToNumber(filter.exam);

  const matched = scopes.filter((s) => {
    if (!s.isActive) return false;
    if (gradeNum != null && s.grade !== gradeNum) return false;
    if (examNo != null && s.examNo !== examNo) return false;
    if (!subjectMatches(s.subject, filter.subject)) return false;
    return true;
  });

  if (matched.length === 0) return null;
  if (matched.length === 1) return matched[0]!;

  const byTitle = matched.find((s) => s.title.includes(filter.exam.replace("段考", "")));
  if (byTitle) return byTitle;

  return matched.sort((a, b) => b.examNo - a.examNo)[0] ?? null;
}

export function formatScopeBadge(filter: LearningScope): string {
  const classLabel =
    filter.classId === "all"
      ? null
      : CLASS_OPTIONS.find((c) => c.value === filter.classId)?.label;
  const parts = [filter.academicYear, filter.grade, filter.subject, filter.exam];
  if (classLabel) parts.push(classLabel);
  return parts.join("｜");
}

export function learningScopeToSearchParams(scope: LearningScope): URLSearchParams {
  const p = new URLSearchParams();
  p.set("academicYear", scope.academicYear);
  p.set("grade", scope.grade);
  p.set("subject", scope.subject);
  p.set("exam", scope.exam);
  p.set("classId", scope.classId);
  if (scope.keyword.trim()) p.set("keyword", scope.keyword.trim());
  return p;
}

export function learningScopeFromSearchParams(params: URLSearchParams): LearningScope {
  return {
    academicYear: params.get("academicYear") ?? DEFAULT_LEARNING_SCOPE.academicYear,
    grade: params.get("grade") ?? DEFAULT_LEARNING_SCOPE.grade,
    subject: params.get("subject") ?? DEFAULT_LEARNING_SCOPE.subject,
    exam: params.get("exam") ?? DEFAULT_LEARNING_SCOPE.exam,
    classId: params.get("classId") ?? DEFAULT_LEARNING_SCOPE.classId,
    keyword: params.get("keyword") ?? "",
  };
}

export function filterStudentsByScope<T extends { name: string; studentCode: string; className: string | null }>(
  rows: T[],
  scope: LearningScope,
): T[] {
  let out = rows;
  if (scope.classId !== "all") {
    out = out.filter((r) => r.className === scope.classId);
  }
  const kw = scope.keyword.trim().toLowerCase();
  if (kw) {
    out = out.filter(
      (r) =>
        r.name.toLowerCase().includes(kw) ||
        r.studentCode.toLowerCase().includes(kw),
    );
  }
  return out;
}
