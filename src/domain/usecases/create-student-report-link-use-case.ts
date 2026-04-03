import { ReportLinkService } from "@/domain/services/report-link-service";

export class CreateStudentReportLinkUseCase {
  constructor(private readonly linkService: ReportLinkService) {}

  execute(input: {
    studentId: string;
    taskId?: string | null;
    expiresInDays?: number | null;
  }) {
    return this.linkService.ensureShareLink(input);
  }
}
