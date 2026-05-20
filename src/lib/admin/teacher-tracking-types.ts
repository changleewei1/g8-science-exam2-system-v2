import type { ExamScopeLike } from "@/lib/admin/learning-scope";

export type TeacherClassCardDto = {
  classId: string;
  studentCount: number;
  byExamScope: Record<
    string,
    {
      avgVideoCompletion: number;
      avgQuizPassRate: number;
      incompleteCount: number;
      studentCount: number;
    }
  >;
};

export type TeacherTrackingMeta = {
  teacherLabel: string;
  grade: string;
  subject: string;
  examScopes: ExamScopeLike[];
  classes: TeacherClassCardDto[];
  restricted: boolean;
};
