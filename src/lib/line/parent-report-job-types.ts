import type { SubjectCode } from "@/lib/line-user-context/parse-subject-input";

export type ParentReportJobPayload =
  | {
      kind: "learning_overview";
      lineUserId: string;
      studentId: string;
      multiBinding: boolean;
    }
  | {
      kind: "subject_query";
      lineUserId: string;
      studentId: string;
      subjectCode: SubjectCode;
      pendingAction:
        | "homework_status"
        | "learning_performance"
        | "video_recommendation";
    };
