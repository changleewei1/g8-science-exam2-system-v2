/**
 * 首頁共用：CTA 與區塊寬度（Next.js + Tailwind）
 * 與 globals 的 `.interactive-btn` 分開，避免首頁綠色 CTA 被套用到 teal 動畫。
 */

/** 首頁亮色區：玻璃卡（與學生登入／技能頁一致語彙） */
export const homeGlassCard =
  "rounded-2xl border border-cyan-200/55 bg-white/70 shadow-[0_12px_40px_-16px_rgba(14,165,233,0.22)] backdrop-blur-xl";

/** 較輕的玻璃面板（圖表外層等） */
export const homeGlassPanel =
  "rounded-2xl border border-cyan-200/45 bg-white/55 shadow-[0_8px_36px_-10px_rgba(14,165,233,0.22)] ring-1 ring-inset ring-white/50 backdrop-blur-lg";

/** 區塊頂分隔（亮色科技帶） */
export const homeLightSectionBorder = "border-t border-sky-200/45";

/** 主內容區一致寬度（Hero／學習循環等） */
export const homeContentMax = "mx-auto w-full max-w-5xl px-4 sm:px-6 lg:max-w-6xl";

/** 較窄敘事欄（標題＋副標） */
export const homeNarrowProse = "mx-auto w-full max-w-3xl";

/** 學生登入 — 主要 CTA（與 Hero `Button variant="student"` 同語彙） */
export const homeCtaPrimaryClass =
  "inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border-0 bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 px-8 py-3 text-base font-semibold text-white shadow-[0_8px_36px_-6px_rgba(34,211,238,0.5)] transition duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_12px_44px_-4px_rgba(34,211,238,0.55)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 motion-reduce:hover:scale-100 sm:w-auto sm:min-w-[10rem] active:scale-[0.99] motion-reduce:active:scale-100";

/** 老師登入 — 次要 CTA（與 Hero `Button variant="teacher"` 同語彙） */
export const homeCtaSecondaryClass =
  "inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border-0 bg-gradient-to-r from-violet-500 via-indigo-500 to-blue-600 px-8 py-3 text-base font-semibold text-white shadow-[0_8px_36px_-6px_rgba(139,92,246,0.45)] transition duration-300 ease-out hover:scale-[1.02] hover:shadow-[0_12px_44px_-4px_rgba(139,92,246,0.5)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 motion-reduce:hover:scale-100 sm:w-auto sm:min-w-[10rem] active:scale-[0.99] motion-reduce:active:scale-100";

/** 第三類連結（例如查看示意）— 玻璃描邊，不搶主按鈕 */
export const homeCtaTertiaryClass =
  "inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-2xl border border-cyan-300/70 bg-white/55 px-8 py-3 text-base font-semibold text-slate-800 shadow-[0_4px_24px_-8px_rgba(14,165,233,0.2)] backdrop-blur-md transition duration-300 ease-out hover:border-cyan-400 hover:bg-white/80 hover:shadow-[0_8px_28px_-8px_rgba(34,211,238,0.25)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 motion-reduce:hover:scale-100 sm:w-auto sm:min-w-[10rem] active:scale-[0.99] motion-reduce:active:scale-100";
