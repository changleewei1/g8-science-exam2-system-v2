/**
 * 首頁共用：CTA 與區塊寬度（Next.js + Tailwind）
 * 與 globals 的 `.interactive-btn` 分開，避免首頁綠色 CTA 被套用到 teal 動畫。
 */

/** 主內容區一致寬度（Hero／學習循環等） */
export const homeContentMax = "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:max-w-6xl";

/** 較窄敘事欄（標題＋副標） */
export const homeNarrowProse = "mx-auto w-full max-w-3xl";

/** 學生登入 — 主要 CTA */
export const homeCtaPrimaryClass =
  "inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl bg-[#22C55E] px-8 py-3 text-base font-semibold text-white shadow-md shadow-[rgba(34,197,94,0.35)] transition duration-200 ease-out hover:scale-[1.02] hover:bg-[#16A34A] hover:shadow-lg hover:shadow-[rgba(22,163,74,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16A34A] motion-reduce:hover:scale-100 sm:w-auto sm:min-w-[9.5rem] active:scale-[0.99] motion-reduce:active:scale-100";

/** 老師登入 — 次要 CTA */
export const homeCtaSecondaryClass =
  "inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-8 py-3 text-base font-semibold text-slate-600 shadow-sm transition duration-200 ease-out hover:border-slate-400 hover:bg-slate-50 hover:text-slate-800 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 motion-reduce:hover:scale-100 sm:w-auto sm:min-w-[9.5rem] active:scale-[0.99] motion-reduce:active:scale-100";

/** 第三類連結（例如查看示意）— 仍次要於綠色 CTA */
export const homeCtaTertiaryClass =
  "inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-xl border border-indigo-200/90 bg-indigo-50/60 px-8 py-3 text-base font-semibold text-indigo-900 shadow-sm transition duration-200 ease-out hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 motion-reduce:hover:scale-100 sm:w-auto sm:min-w-[9.5rem] active:scale-[0.99] motion-reduce:active:scale-100";
