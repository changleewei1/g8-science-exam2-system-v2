import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { getExamScopeUseCase } from "@/infrastructure/composition";
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

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6">
        <StudentBackLink href="/student/dashboard">返回學習總覽</StudentBackLink>
      </div>
      <h1 className="text-2xl font-semibold text-slate-900">{data.scope.title}</h1>
      <p className="mt-2 text-slate-600">{data.scope.description ?? "請依序完成各單元影片與AI學習診斷。"}</p>
      <ul className="mt-8 space-y-3">
        {data.units.map((u) => (
          <li key={u.id}>
            <Link
              href={`/student/unit/${u.id}`}
              className="interactive-btn block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300"
            >
              <span className="font-medium">{u.unitTitle}</span>
              <span className="ml-2 text-xs text-slate-500">{u.unitCode}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
