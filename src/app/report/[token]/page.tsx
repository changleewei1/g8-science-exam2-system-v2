import { PublicReportView } from "@/components/report/PublicReportView";
import { getPublicReportByTokenUseCase } from "@/infrastructure/composition";
import { normalizeReportToken } from "@/lib/report-token";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/** 舊版路徑 /report/{token} 仍相容；新產生的分享網址為 /report?t=… */
export default async function PublicReportPage({ params }: Props) {
  const { token: raw } = await params;
  const token = normalizeReportToken(raw);
  if (!token) notFound();

  const uc = getPublicReportByTokenUseCase();
  const report = await uc.execute(token);
  if (!report) notFound();

  return <PublicReportView report={report} />;
}
