import Link from "next/link";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { getStudentLearningTasksUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const phaseLabel: Record<string, string> = {
  upcoming: "即將開始",
  active: "進行中",
  ended: "已結束",
};

export default async function StudentTasksPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const uc = getStudentLearningTasksUseCase();
  const tasks = await uc.execute(session.studentId);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8 space-y-4">
        <div>
          <StudentBackLink href="/student/dashboard">返回學習總覽</StudentBackLink>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold text-slate-900">學習任務（影片預習）</h1>
        </div>
      </header>

      {tasks.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          目前沒有指派給你班級的任務，或帳號未設定班級。請聯絡老師確認。
        </p>
      ) : (
        <ul className="space-y-8">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{task.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {task.startDate} — {task.endDate}
                    <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                      {phaseLabel[task.phase] ?? task.phase}
                    </span>
                  </p>
                  {task.description && (
                    <p className="mt-2 text-sm text-slate-700">{task.description}</p>
                  )}
                </div>
                <div className="text-right text-sm text-slate-600">
                  完成 {task.completedCount}/{task.totalVideos}（{task.completionRate}%）
                </div>
              </div>

              <div className="space-y-4">
                {task.days.map((day) => (
                  <div key={day.dayIndex}>
                    <h3 className="mb-2 text-sm font-medium text-slate-800">
                      第 {day.dayIndex} 天
                    </h3>
                    <ul className="space-y-2">
                      {day.videos.map((v) => (
                        <li
                          key={v.videoId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2"
                        >
                          <span className="text-slate-800">{v.title}</span>
                          <span className="flex items-center gap-3 text-sm">
                            {v.isCompleted ? (
                              <span className="text-teal-700">已觀看完畢</span>
                            ) : (
                              <span className="text-slate-500">未完成</span>
                            )}
                            <Link
                              href={`/student/video/${v.videoId}`}
                              className="interactive-nav font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-2"
                            >
                              前往觀看
                            </Link>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
