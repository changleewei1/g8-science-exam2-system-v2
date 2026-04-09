import Image from "next/image";
import Link from "next/link";
import { homeContentMax, homeCtaPrimaryClass, homeCtaSecondaryClass, homeNarrowProse } from "./homePageStyles";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-14 md:pb-20 md:pt-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,rgba(79,70,229,0.06),transparent_55%),radial-gradient(ellipse_70%_40%_at_100%_0%,rgba(34,197,94,0.05),transparent_50%)]"
        aria-hidden
      />
      <div className={`${homeContentMax} text-center`}>
        {/* 品牌列 */}
        <div className="mb-10 flex flex-col items-center gap-4 sm:mb-12 md:mb-14 md:flex-row md:justify-center md:gap-8">
          <Image
            src="/mingguan-logo.png"
            alt="名貫補習班"
            width={360}
            height={100}
            className="h-16 w-auto max-w-[min(300px,82vw)] object-contain sm:h-[4.5rem] md:h-24"
            priority
          />
          <div className="hidden h-14 w-px shrink-0 bg-slate-200/90 md:block" aria-hidden />
          <p className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl md:leading-tight">
            名貫補習班
          </p>
        </div>

        <div className={homeNarrowProse}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-600/90 sm:text-[0.8125rem]">
            國二理化｜第二次段考預習
          </p>
          <h1 className="mt-5 text-balance text-3xl font-bold leading-[1.2] tracking-tight text-slate-900 sm:mt-6 sm:text-4xl sm:leading-[1.15] md:text-5xl md:leading-[1.1]">
            影片預習 × AI學習診斷
          </h1>
          <p className="mt-4 text-base font-medium leading-relaxed text-slate-700 sm:mt-5 sm:text-lg">
            快速找出弱點，掌握段考重點
          </p>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-slate-500 sm:mt-4 sm:text-base sm:leading-relaxed">
            依進度解鎖測驗，讓每一次複習都對準考點。
          </p>
        </div>

        <div className="mx-auto mt-12 flex w-full max-w-md flex-col gap-3 sm:mt-14 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 md:mt-16">
          <Link href="/login" className={homeCtaPrimaryClass}>
            學生登入
          </Link>
          <Link href="/admin/login" className={homeCtaSecondaryClass}>
            老師登入
          </Link>
        </div>
        <p className="mx-auto mt-6 max-w-md text-center text-xs leading-relaxed text-slate-400 sm:text-sm">
          家長可陪同學生登入，平台協助追蹤預習與診斷結果。
        </p>
      </div>
    </section>
  );
}
