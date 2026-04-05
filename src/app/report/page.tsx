import { PublicReportView } from "@/components/report/PublicReportView";
import { getPublicReportByTokenUseCase } from "@/infrastructure/composition";
import { normalizeReportToken } from "@/lib/report-token";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ t?: string; token?: string }> };

/** 家長分享連結建議格式：/report?t={token}（無需登入；middleware 不攔截 /report） */
export default async function PublicReportByQueryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = sp.t ?? sp.token ?? "";
  const token = normalizeReportToken(typeof raw === "string" ? raw : "");
  if (!token) {
    return (
      <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col justify-center px-4 py-12 text-center">
        <h1 className="text-xl font-semibold text-slate-900">學生學習報告</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          請點選老師提供的<strong className="font-medium text-slate-800">完整連結</strong>
          開啟報告，網址中需帶有 <code className="rounded bg-slate-100 px-1 text-xs">t=</code>{" "}
          參數。家長<strong className="font-medium text-slate-800">無需登入</strong>。
        </p>
        <Link
          href="/"
          className="interactive-btn mt-8 inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800"
        >
          返回首頁
        </Link>
      </main>
    );
  }

  const uc = getPublicReportByTokenUseCase();
  const report = await uc.execute(token);
  if (!report) notFound();

  return <PublicReportView report={report} />;
}
