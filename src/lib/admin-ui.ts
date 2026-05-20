/**
 * 老師後台共用 Tailwind 片語（與學生端 StudentTopNav / 亮色科技卡一致）
 */

/** 次導覽連結（橫向） */
export const adminNavLink =
  "relative inline-block pb-0.5 text-sm text-slate-600 transition hover:text-cyan-800";

/** 當前區塊（底線與學生端「學習總覽」相同語彙） */
export const adminNavLinkActive =
  "relative inline-block pb-0.5 text-sm font-semibold text-cyan-700 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:rounded-full after:bg-cyan-500";

/** 頂欄（對齊 StudentTopNav） */
export const adminTopHeader =
  "sticky top-0 z-30 border-b border-cyan-200/40 bg-white/80 shadow-[0_4px_24px_-12px_rgba(14,165,233,0.15)] backdrop-blur-xl";

export const adminTopHeaderInner =
  "mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3.5 text-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6";

export const adminMainColumn = "relative mx-auto max-w-6xl px-4 py-6 text-slate-800 sm:px-6 sm:py-8";

export const adminTopHeaderInnerNarrow =
  "mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3.5 text-slate-800 sm:flex-row sm:items-center sm:justify-between sm:px-6";

export const adminMainNarrow = "relative mx-auto max-w-5xl px-4 py-6 text-slate-800 sm:px-6 sm:py-8";

export const adminPageH1 = "text-2xl font-semibold text-slate-900";

export const adminMuted = "text-slate-500";

/** 內容白卡（圓角、淡青邊、淺陰影） */
export const adminCard =
  "rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)]";

/** 表格外層（白卡 + 橫向捲動，與 adminCard 陰影一致） */
export const adminTableWrap =
  "overflow-x-auto rounded-2xl border border-cyan-200/50 bg-white shadow-[0_8px_28px_-10px_rgba(14,165,233,0.12)]";

/** 表頭區塊 */
export const adminTableHead =
  "border-b border-slate-200 bg-slate-50/95 text-left text-xs font-medium uppercase tracking-wide text-slate-600";

/** 資料列分隔 */
export const adminTableRowBorder = "border-t border-slate-200";

/** 表單輸入／多行 */
export const adminInput =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/60";

/** 表單下拉（固定高度） */
export const adminSelect =
  "h-10 w-full rounded-xl border border-slate-200/90 bg-white px-3 text-sm text-slate-900 shadow-inner outline-none transition-colors focus:border-cyan-400 focus:ring-2 focus:ring-cyan-200/60";

/** 次要描邊按鈕 */
export const adminBtnOutline =
  "inline-flex items-center justify-center rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50/60";

/** 行內 code／鍵名 */
export const adminCode =
  "rounded border border-slate-200/80 bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800";

/** 巢狀淺底區塊（卡片內統計格等） */
export const adminInset =
  "rounded-xl border border-slate-200/70 bg-slate-50/70";
