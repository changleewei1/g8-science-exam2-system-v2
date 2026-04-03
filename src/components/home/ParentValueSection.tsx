function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M20 6L9 17l-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const bullets = [
  "可查看學生影片完成進度",
  "可查看學習任務與期限",
  "可查看弱點分析與建議影片",
  "可分享網址直接查看學習報告",
] as const;

export function ParentValueSection() {
  return (
    <section className="border-t border-slate-200/80 bg-[var(--background)] px-4 py-14 sm:px-6 sm:py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-teal-700/90">
              家校同步
            </p>
            <h2 className="mt-3 text-balance text-xl font-bold tracking-tight text-slate-900 sm:text-2xl md:text-3xl">
              家長看得見，學習更安心
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 md:text-base">
              把「有沒有看」、「跟不跟得上」變成可視化資訊，減少猜測與重複溝通，讓關心更有依據。
            </p>
          </div>
          <ul className="space-y-4 rounded-2xl border border-slate-200/90 bg-white p-6 shadow-md shadow-slate-200/40 md:p-8">
            {bullets.map((text) => (
              <li key={text} className="flex gap-3 text-sm leading-relaxed text-slate-700 md:text-base">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
