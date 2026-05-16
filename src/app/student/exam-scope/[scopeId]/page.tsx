import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getExamScopeUseCase, getStudentLearningService } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ scopeId: string }> };

export default async function ExamScopePage({ params }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");
  const { scopeId } = await params;
  const uc = getExamScopeUseCase();
  const data = await uc.execute(scopeId);
  if (!data) notFound();

  const learning = getStudentLearningService();
  const [videoCompletion, quizPass] = await Promise.all([
    learning.getVideoCompletionRate(session.studentId, scopeId),
    learning.getQuizPassRate(session.studentId, scopeId),
  ]);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <StudentBackLink href="/student/dashboard#exam-scopes">返回學習總覽</StudentBackLink>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">{data.scope.title}</h1>
      <p className="mt-2 text-slate-600">{data.scope.description ?? "請依序完成各單元影片與AI學習診斷。"}</p>
      <div className="mt-4">
        <Link
          href={`/student/exam-scope/${scopeId}/skills`}
          className="inline-flex min-h-11 items-center rounded-lg border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-medium text-teal-800 hover:bg-teal-100"
        >
          查看段考技能樹
        </Link>
      </div>

      <section className="mb-8 mt-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-medium text-slate-700">整體進度</h2>
        <ProgressBar value={videoCompletion} label="影片完成率（範圍內）" />
        <ProgressBar value={quizPass} label="測驗通過率（已提交次數）" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-700">單元列表</h2>
        {data.units.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600">
            <p className="font-medium text-slate-800">此段考範圍尚未掛載單元</p>
            <p className="mt-2">請待教師於後台完成單元設定後再查看。</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {data.units.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/student/unit/${u.id}`}
                  className="interactive-btn block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300"
                >
                  <span className="font-medium text-slate-900">{u.unitTitle}</span>
                  <span className="ml-2 text-xs text-slate-500">{u.unitCode}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
