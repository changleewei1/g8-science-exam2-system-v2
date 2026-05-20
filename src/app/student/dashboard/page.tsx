import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/student/dashboard/StudentDashboard";
import { getRepositories } from "@/infrastructure/composition";
import { buildStudentDashboardPayload } from "@/lib/student-dashboard-data";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ scopeId?: string | string[] }> };

export default async function StudentDashboardPage({ searchParams }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const sp = await searchParams;
  const rawScopeId =
    typeof sp.scopeId === "string"
      ? sp.scopeId
      : Array.isArray(sp.scopeId)
        ? sp.scopeId[0]
        : undefined;

  const { students, examScopes, scopeUnits } = getRepositories();
  const student = await students.findById(session.studentId);
  const scopes = await examScopes.findAllActive();

  const data = await buildStudentDashboardPayload(
    session.studentId,
    student?.name ?? "同學",
    student?.grade ?? 8,
    scopes,
    scopeUnits,
    rawScopeId?.trim() ?? null,
  );

  const trimmed = rawScopeId?.trim();
  const defaultId = data.defaultOverviewScopeId;
  if (data.overviewScopeOptions.length > 0 && defaultId && trimmed !== defaultId) {
    redirect(`/student/dashboard?scopeId=${encodeURIComponent(defaultId)}#learning-overview`);
  }

  return <StudentDashboard data={data} />;
}
