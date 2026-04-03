import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { getListUnitVideosUseCase, getRepositories } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";
import { ProgressBar } from "@/components/ui/ProgressBar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ unitId: string }> };

export default async function UnitPage({ params }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");
  const { unitId } = await params;
  const { scopeUnits } = getRepositories();
  const unit = await scopeUnits.findById(unitId);
  if (!unit) notFound();

  const uc = getListUnitVideosUseCase();
  const rows = await uc.execute(unitId, session.studentId);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <StudentBackLink href={`/student/exam-scope/${unit.examScopeId}`}>
          返回段考範圍
        </StudentBackLink>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">{unit.unitTitle}</h1>
      <p className="mt-1 text-sm text-slate-500">{unit.unitCode}</p>
      <ul className="mt-8 space-y-4">
        {rows.map((r) => (
          <li
            key={r.video.id}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <Link
                  href={`/student/video/${r.video.id}`}
                  className="interactive-nav font-medium text-teal-700 underline-offset-4 hover:underline"
                >
                  {r.video.title}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  完成率 {r.completionRate.toFixed(0)}%
                  {r.isCompleted ? " · 已觀看完畢" : ""}
                  {r.quizPassed ? " · 測驗通過" : r.canTakeQuiz ? " · 可測驗" : ""}
                </p>
              </div>
              {r.quizId && (
                <Link
                  href={`/student/quiz/${r.quizId}`}
                  className={`inline-flex min-h-9 items-center rounded-lg px-3 py-1.5 text-sm font-medium ${
                    r.canTakeQuiz
                      ? "interactive-btn bg-teal-600 text-white"
                      : "pointer-events-none cursor-not-allowed bg-slate-200 text-slate-500"
                  }`}
                  aria-disabled={!r.canTakeQuiz}
                >
                  AI學習診斷
                </Link>
              )}
            </div>
            <div className="mt-3">
              <ProgressBar value={r.completionRate} />
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
