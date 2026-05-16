import { ActiveSpringExamScopeCard, type ActiveSpringExamScopeCardProps } from "@/components/student/ActiveSpringExamScopeCard";

type Props = {
  springSecond: ActiveSpringExamScopeCardProps | null;
  springThird: ActiveSpringExamScopeCardProps | null;
};

function LockedExamCard({ label }: { label: string }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-100/90 p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-2 text-xs text-slate-500">尚未開放</p>
      <button
        type="button"
        disabled
        className="mt-4 inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-lg border border-slate-300 bg-slate-200 px-3 text-sm font-medium text-slate-500"
      >
        準備中
      </button>
    </div>
  );
}

export function StudentG8ExamScopeOverview({ springSecond, springThird }: Props) {
  return (
    <section id="exam-scopes" className="mb-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-slate-900">國二理化段考範圍</h2>
      <p className="mt-1 text-sm text-slate-600">依學期與段次選擇範圍；未開放項目請待學校公告。</p>

      <div className="mt-6 space-y-8">
        <div>
          <h3 className="text-sm font-medium text-slate-700">上學期</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <LockedExamCard label="第一次段考" />
            <LockedExamCard label="第二次段考" />
            <LockedExamCard label="第三次段考" />
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-slate-700">下學期</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <LockedExamCard label="第一次段考" />

            {springSecond ? (
              <ActiveSpringExamScopeCard {...springSecond} />
            ) : (
              <div className="flex flex-col rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-medium">下學期第二次段考</p>
                <p className="mt-2 text-xs">找不到段考資料，請聯絡管理員確認 exam_scopes。</p>
              </div>
            )}

            {springThird ? (
              <ActiveSpringExamScopeCard {...springThird} />
            ) : (
              <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <p className="text-sm font-semibold text-slate-800">國二理化下學期第三次段考</p>
                <p className="mt-2 text-xs text-slate-600">第三次段考資料尚未建立，請先匯入 exam_scope。</p>
                <button
                  type="button"
                  disabled
                  className="mt-4 inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-lg border border-slate-300 bg-slate-200 px-3 text-sm font-medium text-slate-500"
                >
                  準備中
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
