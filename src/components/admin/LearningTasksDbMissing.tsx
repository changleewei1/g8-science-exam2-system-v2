import Link from "next/link";

type Props = {
  /** 供除錯用，預設收合於「技術人員參考」區塊 */
  technicalDetail?: string;
};

/**
 * 資料庫尚未建立學習任務相關資料表時的說明（避免整頁 Runtime Error）
 */
export function LearningTasksDbMissing({ technicalDetail }: Props) {
  return (
    <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-6 shadow-md text-amber-950">
      <h2 className="text-lg font-semibold text-slate-900">尚未完成系統設定</h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-800">
        建立學習任務前，需先完成一次初始化設定。
      </p>
      <p className="mt-2 text-sm text-slate-700">
        此步驟只需執行一次，完成後即可建立學習任務。
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/admin/help/learning-setup"
          className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white shadow-md"
        >
          查看設定教學
        </Link>
        <Link
          href="/admin"
          className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 shadow-sm"
        >
          返回後台首頁
        </Link>
      </div>
      {technicalDetail ? (
        <details className="mt-6 rounded-xl border border-amber-200/60 bg-white/50 p-3 text-sm text-slate-700">
          <summary className="cursor-pointer select-none font-medium text-slate-800">
            技術人員參考（選讀）
          </summary>
          <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-xs text-slate-600">
            {technicalDetail}
          </pre>
        </details>
      ) : null}
    </div>
  );
}
