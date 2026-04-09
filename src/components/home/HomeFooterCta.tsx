import Link from "next/link";
import {
  homeCtaPrimaryClass,
  homeCtaSecondaryClass,
  homeCtaTertiaryClass,
} from "./homePageStyles";

export function HomeFooterCta() {
  return (
    <section className="border-t border-slate-200/70 bg-white/60 px-4 py-14 backdrop-blur-[1px] sm:px-6 sm:py-16 md:py-20">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
          不是學更多，而是用對方法學
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-slate-600 sm:text-base">
          用預習與AI學習診斷把力氣花在對的地方，讓每一段學習都可追蹤、可調整。
        </p>
        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
          <Link href="/login" className={homeCtaPrimaryClass}>
            學生登入
          </Link>
          <Link href="/admin/login" className={homeCtaSecondaryClass}>
            老師登入
          </Link>
          <a href="#report-demo" className={homeCtaTertiaryClass}>
            查看報告示意
          </a>
        </div>
      </div>
    </section>
  );
}
