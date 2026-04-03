import Image from "next/image";
import Link from "next/link";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden px-4 pb-6 pt-8 sm:px-6 sm:pb-8 sm:pt-12 md:pt-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(13,148,136,0.18),transparent)]"
        aria-hidden
      />
      <div className="mx-auto max-w-6xl text-center">
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 sm:mb-10 sm:gap-4 md:mb-12 md:gap-5">
          <Image
            src="/mingguan-logo.png"
            alt=""
            width={360}
            height={100}
            className="h-16 w-auto max-w-[min(320px,78vw)] shrink-0 object-contain object-left sm:h-20 md:h-24 lg:h-28"
            priority
          />
          <span className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl lg:text-5xl">
            名貫補習班
          </span>
        </div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-teal-700/90 sm:text-base">
          國二理化｜第二次段考預習
        </p>
        <h1 className="mt-4 text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-4xl lg:text-5xl">
          影片預習 × AI學習診斷
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 sm:text-lg">
          依進度解鎖測驗，掌握每一段考重點。
        </p>
        <div className="mt-10 flex w-full max-w-md flex-col items-stretch justify-center gap-3 sm:mx-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
          <Link
            href="/login"
            className="interactive-btn inline-flex min-h-12 items-center justify-center rounded-xl bg-teal-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-teal-600/25"
          >
            學生登入
          </Link>
          <Link
            href="/admin/login"
            className="interactive-btn inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-800 shadow-sm"
          >
            老師登入
          </Link>
        </div>
      </div>
    </section>
  );
}
