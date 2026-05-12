import Link from "next/link";

type Props = {
  springSecondScopeId: string | null;
  springThirdScopeId: string | null;
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

export function StudentG8ExamScopeOverview({ springSecondScopeId, springThirdScopeId }: Props) {
  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
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

            {springSecondScopeId ? (
              <div className="flex flex-col rounded-xl border border-teal-200 bg-gradient-to-b from-teal-50 to-white p-4 shadow-sm ring-1 ring-teal-100">
                <p className="text-sm font-semibold text-slate-900">國二理化下學期第二次段考</p>
                <p className="mt-1 text-xs font-medium text-teal-800">已開放</p>
                <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
                  <li>酸鹼中和</li>
                  <li>反應速率</li>
                </ul>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/student/exam-scope/${springSecondScopeId}/skills`}
                    className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-3 text-sm font-medium text-white"
                  >
                    進入技能樹練習
                  </Link>
                  <Link
                    href={`/student/exam-scope/${springSecondScopeId}`}
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
            ) : (
              <div className="flex flex-col rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <p className="font-medium">下學期第二次段考</p>
                <p className="mt-2 text-xs">找不到段考資料，請聯絡管理員確認 exam_scopes。</p>
              </div>
            )}

            {springThirdScopeId ? (
              <div className="flame-glow flex flex-col rounded-xl border border-violet-300 bg-gradient-to-b from-violet-50 via-white to-fuchsia-50 p-4 shadow-md ring-1 ring-violet-200/60">
                <p className="text-sm font-semibold text-slate-900">
                  國二理化下學期第三次段考 <span className="animate-flame inline-block">🔥</span> 新開放
                </p>
                <p className="mt-1 text-xs font-medium text-violet-800">開放中</p>
                <ul className="mt-2 list-inside list-disc text-xs text-slate-600">
                  <li>有機化合物</li>
                  <li>力與壓力</li>
                </ul>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  本次段考包含有機化合物、力與壓力，請依照技能樹完成影片學習與智慧練習。
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  <Link
                    href={`/student/exam-scope/${springThirdScopeId}/skills`}
                    className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg bg-violet-700 px-3 text-sm font-medium text-white"
                  >
                    🎯 進入技能樹練習
                  </Link>
                  <Link
                    href={`/student/exam-scope/${springThirdScopeId}`}
                    className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg border border-violet-300 bg-white px-3 text-sm font-medium text-violet-900"
                  >
                    查看影片單元
                  </Link>
                  <Link
                    href="/student/tasks"
                    className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
                  >
                    查看學習任務
                  </Link>
                </div>
              </div>
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
