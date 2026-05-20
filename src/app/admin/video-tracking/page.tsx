import { redirect } from "next/navigation";
import { Suspense } from "react";
import { VideoTrackingOverviewClient } from "@/components/admin/VideoTrackingOverviewClient";
import { getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminVideoTrackingPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { examScopes } = getRepositories();
  const scopes = await examScopes.findAllActive();

  const scopeDtos = scopes.map((s) => ({
    id: s.id,
    title: s.title,
    grade: s.grade,
    term: s.term,
    examNo: s.examNo,
    subject: s.subject,
    isActive: s.isActive,
  }));

  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-slate-500">載入學習總覽…</div>
      }
    >
      <VideoTrackingOverviewClient scopes={scopeDtos} />
    </Suspense>
  );
}
