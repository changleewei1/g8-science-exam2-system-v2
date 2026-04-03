import type { StudentReportDto } from "@/domain/services/student-report-service";
import { ReportLinkService } from "@/domain/services/report-link-service";
import { StudentReportService } from "@/domain/services/student-report-service";

export class GetPublicReportByTokenUseCase {
  constructor(
    private readonly linkService: ReportLinkService,
    private readonly reportService: StudentReportService,
  ) {}

  async execute(token: string): Promise<StudentReportDto | null> {
    const resolved = await this.linkService.resolveToken(token);
    if (!resolved) return null;
    return this.reportService.buildReport({
      studentId: resolved.studentId,
      examScopeId: null,
      taskId: resolved.taskId,
      audience: "parent",
    });
  }
}
