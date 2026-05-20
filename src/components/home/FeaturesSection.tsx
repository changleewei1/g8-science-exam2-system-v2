import { homeGlassCard, homeLightSectionBorder } from "./homePageStyles";

function IconSparkles({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9.5 2l1.2 4.2L15 7.5l-4.3 1.3L9.5 13 8.3 8.8 4 7.5l4.2-1.3L9.5 2zM17.5 11l.9 3.1 3.1 1-3.2 1 .9 3.2-2.7-2-2.7 2 .9-3.2-3.2-1 3.1-1 .9-3.1 2.8 2.1z"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconVideo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="5" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
    </svg>
  );
}

function IconReport({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M14 2v6h6M8 13h8M8 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const items = [
  {
    key: "ai",
    Icon: IconSparkles,
    title: "AI弱點分析",
    desc: "依答題與技能標籤歸納弱點，讓複習時間花在刀口上。",
    iconWrap: "border border-teal-200/80 bg-teal-50/90 text-teal-700 shadow-inner",
  },
  {
    key: "task",
    Icon: IconClipboard,
    title: "預習任務追蹤",
    desc: "老師指派每日觀影與期限，完成度一目了然。",
    iconWrap: "border border-sky-200/80 bg-sky-50/90 text-sky-700 shadow-inner",
  },
  {
    key: "video",
    Icon: IconVideo,
    title: "精準影片補強",
    desc: "對應單元與技能推薦影片，補洞路徑更清楚。",
    iconWrap: "border border-violet-200/80 bg-violet-50/90 text-violet-700 shadow-inner",
  },
  {
    key: "parent",
    Icon: IconReport,
    title: "家長學習報告",
    desc: "進度與弱點摘要可分享，家長同步掌握學習狀態。",
    iconWrap: "border border-emerald-200/80 bg-emerald-50/90 text-emerald-700 shadow-inner",
  },
] as const;

export function FeaturesSection() {
  return (
    <section
      className={`relative ${homeLightSectionBorder} bg-transparent px-4 py-14 sm:px-6 sm:py-16 md:py-20`}
    >
      <div className="mx-auto max-w-6xl">
        <header className="text-center">
          <h2 className="bg-gradient-to-r from-slate-900 via-cyan-800 to-slate-900 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl md:text-3xl">
            系統特色
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-600 md:text-base">
            從預習到AI學習診斷，串起資料與教學決策的一條龍設計。
          </p>
        </header>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => {
            const I = item.Icon;
            return (
              <article
                key={item.key}
                className={`flex flex-col p-5 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/60 hover:shadow-[0_14px_40px_-14px_rgba(14,165,233,0.25)] motion-reduce:hover:translate-y-0 ${homeGlassCard}`}
              >
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${item.iconWrap}`}
                >
                  <I className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.desc}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
