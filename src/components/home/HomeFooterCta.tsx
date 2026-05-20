import Link from "next/link";
import {
  homeCtaPrimaryClass,
  homeCtaSecondaryClass,
  homeCtaTertiaryClass,
  homeGlassCard,
  homeLightSectionBorder,
} from "./homePageStyles";

export function HomeFooterCta() {
  return (
    <section
      className={`relative ${homeLightSectionBorder} bg-transparent px-4 py-14 sm:px-6 sm:py-16 md:py-20`}
    >
      <div className="mx-auto max-w-3xl">
        <div
          className={`relative overflow-hidden px-6 py-10 text-center sm:px-10 sm:py-12 ${homeGlassCard}`}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent"
            aria-hidden
          />
          <h2 className="text-balance bg-gradient-to-r from-slate-900 via-cyan-800 to-slate-900 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl md:text-3xl">
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
      </div>
    </section>
  );
}
