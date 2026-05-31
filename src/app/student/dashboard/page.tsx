import { redirect } from "next/navigation";
import { StudentDashboard } from "@/components/student/dashboard/StudentDashboard";
import { getRepositories } from "@/infrastructure/composition";
import { buildStudentFocusHomePayload } from "@/lib/student-dashboard-data";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const { students, examScopes } = getRepositories();
  const student = await students.findById(session.studentId);
  const scopes = await examScopes.findAllActive();

  const data = await buildStudentFocusHomePayload(
    session.studentId,
    student?.name ?? "同學",
    student?.grade ?? 8,
    scopes,
  );

  return <StudentDashboard data={data} />;
}
