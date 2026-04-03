import Link from "next/link";

export function HomeFooterCta() {
  return (
    <section className="border-t border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-white px-4 py-14 sm:px-6 sm:py-16 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
          不是學更多，而是用對方法學
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
          用預習與AI學習診斷把力氣花在對的地方，讓每一段學習都可追蹤、可調整。
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
          <Link
            href="/login"
            className="interactive-btn inline-flex min-h-12 items-center justify-center rounded-2xl bg-teal-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-teal-600/20"
          >
            學生登入
          </Link>
          <Link
            href="/admin/login"
            className="interactive-btn inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-800 shadow-md"
          >
            老師登入
          </Link>
          <a
            href="#report-demo"
            className="interactive-btn inline-flex min-h-12 items-center justify-center rounded-2xl border border-teal-200 bg-teal-50/80 px-8 py-3 text-base font-semibold text-teal-900 shadow-sm"
          >
            查看報告示意
          </a>
        </div>
      </div>
    </section>
  );
}
