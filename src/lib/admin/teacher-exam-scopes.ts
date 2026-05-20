import {
  type ExamScopeLike,
  gradeLabelToNumber,
  subjectMatches,
} from "@/lib/admin/learning-scope";

/**
 * 依老師授課年級／科目篩選可操作的段考範圍（exam_scopes）。
 */
export function filterExamScopesForTeacher(
  scopes: ExamScopeLike[],
  opts: { grade: string; subject: string },
): ExamScopeLike[] {
  const gradeNum = gradeLabelToNumber(opts.grade);
  return scopes
    .filter((s) => {
      if (!s.isActive) return false;
      if (gradeNum != null && s.grade !== gradeNum) return false;
      return subjectMatches(s.subject, opts.subject);
    })
    .sort((a, b) => a.examNo - b.examNo || a.title.localeCompare(b.title, "zh-Hant"));
}
