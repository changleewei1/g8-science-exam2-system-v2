import type { StudentReportDto } from "@/domain/services/student-report-service";
import { StudentReportService } from "@/domain/services/student-report-service";

export class GetAdminStudentReportUseCase {
  constructor(private readonly reportService: StudentReportService) {}

  execute(input: {
    studentId: string;
    examScopeId?: string | null;
    taskId?: string | null;
  }): Promise<StudentReportDto | null> {
    return this.reportService.buildReport({
      studentId: input.studentId,
      examScopeId: input.examScopeId,
      taskId: input.taskId,
      audience: "admin",
    });
  }
}
