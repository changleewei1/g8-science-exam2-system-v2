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
    ring: "ring-sky-200/80",
    bg: "bg-gradient-to-b from-sky-50/90 to-white",
    iconBg: "bg-sky-100 text-sky-700",
    accent: "text-sky-900",
    sub: "text-sky-800/90",
  },
  {
    key: "class",
    title: "聽課",
    titleEn: "In-Class",
    icon: IconTarget,
    bullets: ["專注理解核心觀念", "即時解決問題"],
    ring: "ring-violet-200/80",
    bg: "bg-gradient-to-b from-violet-50/90 to-white",
    iconBg: "bg-violet-100 text-violet-700",
    accent: "text-violet-900",
    sub: "text-violet-900/85",
  },
  {
    key: "review",
    title: "複習",
    titleEn: "Review",
    icon: IconRefresh,
    bullets: ["題目練習", "AI弱點分析", "精準補強"],
    ring: "ring-emerald-200/80",
    bg: "bg-gradient-to-b from-emerald-50/90 to-white",
    iconBg: "bg-emerald-100 text-emerald-700",
    accent: "text-emerald-900",
    sub: "text-emerald-900/85",
  },
] as const;

export function LearningCycleSection() {
  return (
    <section className="border-t border-slate-200/80 bg-[var(--background)] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <h2 className="text-balance text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
            最高效率的學習模式：預習 → 聽課 → 複習
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            AI精準分析弱點，搭配學習循環，讓每一段學習都有方向與效果。
          </p>
        </header>

        <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <article
                key={c.key}
                className={`flex flex-col rounded-2xl p-6 shadow-md shadow-slate-200/60 ring-1 ring-inset ${c.ring} ${c.bg}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${c.accent}`}>{c.title}</h3>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {c.titleEn}
                    </p>
                  </div>
                </div>
                <ul className={`mt-5 flex flex-1 flex-col gap-2.5 text-sm leading-relaxed ${c.sub}`}>
                  {c.bullets.map((line) => (
                    <li key={line} className="flex gap-2">
                      <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-current opacity-60" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-14 max-w-xl text-center text-base font-medium leading-8 text-slate-700 md:text-lg">
          沒有預習 → 上課聽不懂
          <br />
          沒有複習 → 很快就忘記
        </p>
      </div>
    </section>
  );
}
