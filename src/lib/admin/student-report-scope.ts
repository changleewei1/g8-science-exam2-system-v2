import { examLabelToNumber, gradeLabelToNumber } from "@/lib/admin/learning-scope";

/** 學生學習報告頁：段考範圍篩選（URL／UI 用） */
export type StudentReportScopeFilter = {
  grade: string;
  subject: string;
  semester: string;
  exam: string;
};

/** 段考範圍（含 UI 顯示欄位；academicYear 待 DB 擴充） */
export type ReportExamScope = {
  id: string;
  academicYear: string;
  grade: string;
  subject: string;
  semester: string;
  exam: string;
  title: string;
  /** DB：7=國一、8=國二、9=國三 */
  gradeNum: number;
  term: number;
  examNo: number;
};

export const SEMESTER_OPTIONS = ["上學期", "下學期"] as const;

export const DEFAULT_STUDENT_REPORT_SCOPE: StudentReportScopeFilter = {
  grade: "國二",
  subject: "理化",
  semester: "下學期",
  exam: "第二次段考",
};

const DEFAULT_ACADEMIC_YEAR = "114學年度";

export function gradeNumberToLabel(grade: number): string {
  if (grade === 7) return "國一";
  if (grade === 8) return "國二";
  if (grade === 9) return "國三";
  return `國${grade - 6}`;
}

export function termToSemester(term: number): string {
  return term === 1 ? "上學期" : "下學期";
}

export function semesterToTerm(semester: string): number | null {
  if (semester === "上學期") return 1;
  if (semester === "下學期") return 2;
  return null;
}

export function examNumberToLabel(examNo: number): string {
  if (examNo === 1) return "第一次段考";
  if (examNo === 2) return "第二次段考";
  if (examNo === 3) return "第三次段考";
  return `第${examNo}次段考`;
}

function subjectDbToFilter(subject: string): string {
  const s = subject.toLowerCase();
  if (s.includes("數學")) return "數學";
  if (s.includes("理化") || s.includes("自然")) return "理化";
  return "理化";
}

function subjectMatchesDb(scopeSubject: string, filterSubject: string): boolean {
  const s = scopeSubject.toLowerCase();
  if (filterSubject === "理化") return s.includes("理化") || s.includes("自然");
  if (filterSubject === "數學") return s.includes("數學");
  return true;
}

export function domainExamScopeToReport(scope: {
  id: string;
  subject: string;
  grade: number;
  term: number;
  examNo: number;
  title: string;
  isActive: boolean;
}): ReportExamScope {
  return {
    id: scope.id,
    academicYear: DEFAULT_ACADEMIC_YEAR,
    grade: gradeNumberToLabel(scope.grade),
    subject: subjectDbToFilter(scope.subject),
    semester: termToSemester(scope.term),
    exam: examNumberToLabel(scope.examNo),
    title: scope.title,
    gradeNum: scope.grade,
    term: scope.term,
    examNo: scope.examNo,
  };
}

export function reportScopeToFilter(scope: ReportExamScope): StudentReportScopeFilter {
  return {
    grade: scope.grade,
    subject: scope.subject,
    semester: scope.semester,
    exam: scope.exam,
  };
}

export function formatReportScopeLabel(filter: StudentReportScopeFilter): string {
  return `${filter.grade}｜${filter.subject}｜${filter.semester}｜${filter.exam}`;
}

export function resolveExamScopeFromReportFilter(
  scopes: ReportExamScope[],
  filter: StudentReportScopeFilter,
): ReportExamScope | null {
  const gradeNum = gradeLabelToNumber(filter.grade);
  const term = semesterToTerm(filter.semester);
  const examNo = examLabelToNumber(filter.exam);

  const matched = scopes.filter((s) => {
    if (gradeNum != null && s.gradeNum !== gradeNum) return false;
    if (term != null && s.term !== term) return false;
    if (examNo != null && s.examNo !== examNo) return false;
    if (s.subject === filter.subject) return true;
    return subjectMatchesDb(s.title, filter.subject);
  });

  if (matched.length === 0) return null;
  if (matched.length === 1) return matched[0]!;
  return matched.sort((a, b) => b.examNo - a.examNo)[0] ?? null;
}

export function studentReportFilterFromSearchParams(
  params: URLSearchParams,
): StudentReportScopeFilter {
  return {
    grade: params.get("grade") ?? DEFAULT_STUDENT_REPORT_SCOPE.grade,
    subject: params.get("subject") ?? DEFAULT_STUDENT_REPORT_SCOPE.subject,
    semester: params.get("semester") ?? DEFAULT_STUDENT_REPORT_SCOPE.semester,
    exam: params.get("exam") ?? DEFAULT_STUDENT_REPORT_SCOPE.exam,
  };
}

export function studentReportFilterToSearchParams(
  filter: StudentReportScopeFilter,
): URLSearchParams {
  const p = new URLSearchParams();
  p.set("grade", filter.grade);
  p.set("subject", filter.subject);
  p.set("semester", filter.semester);
  p.set("exam", filter.exam);
  return p;
}
