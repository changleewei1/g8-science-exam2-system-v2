import Link from "next/link";

export type ActiveSpringExamScopeCardProps = {
  scopeId: string;
  /** 來自 exam_scopes.title */
  title: string;
  /** 依 sort_order 排列的單元標題 */
  unitTitles: string[];
};

/**
 * 下學期段考「已開放」卡片（第二次、第三次共用同一套視覺，以第二次段考 teal 樣式為準）。
 */
export function ActiveSpringExamScopeCard({ scopeId, title, unitTitles }: ActiveSpringExamScopeCardProps) {
  const hasUnits = unitTitles.length > 0;
  const blurb = hasUnits
    ? `本次段考包含 ${unitTitles.join("、")}，請依照技能樹完成影片學習與智慧練習。`
    : "請依照技能樹完成影片學習與智慧練習；單元資料將由教師陸續上架。";

  return (
    <div className="flex flex-col rounded-xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-4 shadow-sm ring-1 ring-teal-100">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-1 text-xs font-medium text-teal-800">已開放</p>
      {hasUnits ? (
        <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
          {unitTitles.map((t, i) => (
            <li key={`${i}-${t}`}>{t}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-slate-500">尚未掛載單元，請待管理員於後台設定 scope_units。</p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-slate-600">{blurb}</p>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          href={`/student/exam-scope/${scopeId}/skills`}
          className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-3 text-sm font-medium text-white"
        >
          進入技能樹練習
        </Link>
        <Link
          href={`/student/exam-scope/${scopeId}`}
          className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg border border-teal-300 bg-white px-3 text-sm font-medium text-teal-800"
        >
          查看影片單元
        </Link>
        <Link
          href="/student/tasks"
          className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-medium text-slate-800"
        >
          查看學習任務
        </Link>
      </div>
    </div>
  );
}
