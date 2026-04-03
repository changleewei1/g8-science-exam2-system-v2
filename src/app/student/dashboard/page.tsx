import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentDashboardUseCase, getRepositories } from "@/infrastructure/composition";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getStudentSession } from "@/lib/session";
import { getDefaultExamScopeId } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const envScope = getDefaultExamScopeId();
  const { examScopes } = getRepositories();
  const scopes = await examScopes.findAllActive();
  const scopeId = envScope ?? scopes[0]?.id;
  if (!scopeId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-slate-600">尚未設定段考範圍，請聯絡管理員。</p>
      </main>
    );
  }

  const { students } = getRepositories();
  const student = await students.findById(session.studentId);

  const uc = getStudentDashboardUseCase();
  const data = await uc.execute(session.studentId, scopeId);
  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-slate-600">找不到段考資料。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 sm:text-base">你好，{student?.name ?? "同學"}</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{data.scope.title}</h1>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link
            href="/student/tasks"
            className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg border border-teal-600 bg-white px-4 py-2.5 text-sm font-medium text-teal-700 sm:text-base"
          >
            學習任務
          </Link>
          <Link
            href={`/student/exam-scope/${data.scope.id}`}
            className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white sm:text-base"
          >
            進入學習單元
          </Link>
        </div>
      </header>

      <section className="mb-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-medium text-slate-700">整體進度</h2>
        <ProgressBar value={data.videoCompletion} label="影片完成率（範圍內）" />
        <ProgressBar value={data.quizPass} label="測驗通過率（已提交次數）" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-700">單元列表</h2>
        <ul className="space-y-3">
          {data.units.map((u) => (
            <li key={u.id}>
              <Link
                href={`/student/unit/${u.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300"
              >
                <span className="font-medium text-slate-900">{u.unitTitle}</span>
                <span className="ml-2 text-xs text-slate-500">{u.unitCode}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
