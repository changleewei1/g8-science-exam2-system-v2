import { homeContentMax } from "./homePageStyles";

function IconBook({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M8 7h8M8 11h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconTarget({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 21v-5h5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v5h-5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const cards = [
  {
    key: "pre",
    title: "預習",
    titleEn: "Pre-Learning",
    icon: IconBook,
    bullets: ["看影片建立觀念", "降低上課理解難度"],
    accentBar: "bg-sky-400",
    iconBg: "bg-sky-50 text-sky-700 ring-1 ring-sky-100/90",
    titleClass: "text-slate-900",
    bulletClass: "text-slate-600",
  },
  {
    key: "class",
    title: "聽課",
    titleEn: "In-Class",
    icon: IconTarget,
    bullets: ["專注理解核心觀念", "即時解決問題"],
    accentBar: "bg-violet-400",
    iconBg: "bg-violet-50 text-violet-700 ring-1 ring-violet-100/90",
    titleClass: "text-slate-900",
    bulletClass: "text-slate-600",
  },
  {
    key: "review",
    title: "複習",
    titleEn: "Review",
    icon: IconRefresh,
    bullets: ["題目練習", "AI弱點分析", "精準補強"],
    accentBar: "bg-emerald-400",
    iconBg: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100/90",
    titleClass: "text-slate-900",
    bulletClass: "text-slate-600",
  },
] as const;

export function LearningCycleSection() {
  return (
    <section className="border-t border-slate-200/70 bg-white/50 px-4 py-16 backdrop-blur-[2px] sm:px-6 sm:py-20 md:py-24">
      <div className={homeContentMax}>
        <header className="text-center">
          <h2 className="text-balance text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl md:text-[1.875rem] md:leading-snug lg:text-[2rem]">
            最高效率的學習模式：預習 → 聽課 → 複習
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:mt-5 md:text-lg md:leading-relaxed">
            AI 精準分析弱點，搭配學習循環，讓每一段學習都有方向與效果。
          </p>
        </header>

        <div className="mt-12 grid gap-6 md:mt-14 md:grid-cols-3 md:gap-8">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <article
                key={c.key}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300/90 hover:shadow-md motion-reduce:transform-none motion-reduce:hover:transform-none sm:p-7"
              >
                <div
                  className={`absolute left-0 top-0 h-1 w-full ${c.accentBar} opacity-90`}
                  aria-hidden
                />
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 pt-0.5 text-left">
                    <h3 className={`text-lg font-semibold ${c.titleClass}`}>{c.title}</h3>
                    <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                      {c.titleEn}
                    </p>
                  </div>
                </div>
                <ul
                  className={`mt-6 flex flex-1 flex-col gap-3 text-sm leading-relaxed ${c.bulletClass}`}
                >
                  {c.bullets.map((line) => (
                    <li key={line} className="flex gap-3">
                      <span
                        className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"
                        aria-hidden
                      />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-14 max-w-lg text-center text-base font-medium leading-8 text-slate-700 md:mt-16 md:text-lg md:leading-9">
          沒有預習 → 上課聽不懂
          <br />
          沒有複習 → 很快就忘記
        </p>
      </div>
    </section>
  );
}
