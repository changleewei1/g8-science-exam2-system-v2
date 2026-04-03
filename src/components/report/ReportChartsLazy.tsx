"use client";

import dynamic from "next/dynamic";
import type { StudentReportDto } from "@/domain/services/student-report-service";

const ReportChartsInner = dynamic(
  () => import("./ReportCharts").then((m) => m.ReportCharts),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[280px] items-center justify-center rounded-2xl border border-slate-200 bg-white"
        role="status"
        aria-busy="true"
      >
        <p className="text-sm text-slate-500">圖表載入中…</p>
      </div>
    ),
  },
);

type Props = { report: StudentReportDto };

export function ReportChartsLazy({ report }: Props) {
  return <ReportChartsInner report={report} />;
}
