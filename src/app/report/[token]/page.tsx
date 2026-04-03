import { ReportChartsLazy } from "@/components/report/ReportChartsLazy";
import { getPublicReportByTokenUseCase } from "@/infrastructure/composition";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function PublicReportPage({ params }: Props) {
  const { token } = await params;
  const uc = getPublicReportByTokenUseCase();
  const report = await uc.execute(token);
  if (!report) notFound();

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-teal-700/90">學生學習報告</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            {report.student.displayName} 同學
          </h1>
          {report.student.className ? (
            <p className="mt-2 text-sm text-slate-600">{report.student.className} 班</p>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            以下為本次學習任務的完成情況與學習表現分析
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        <ReportChartsLazy report={report} />
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm"
          >
            返回首頁
          </Link>
          <p className="text-center text-xs text-slate-500">
            本頁由教學系統自動產生 · 僅供家長參考
          </p>
        </div>
      </footer>
    </div>
  );
}
