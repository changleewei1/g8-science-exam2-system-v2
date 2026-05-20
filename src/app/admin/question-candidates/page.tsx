import { redirect } from "next/navigation";
import { QuestionCandidatesAdminClient } from "@/components/admin/QuestionCandidatesAdminClient";
import { AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QuestionCandidatesPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <AdminStandaloneHeader title="題目候選審核" narrow />
      <AdminStandaloneMain narrow>
        <QuestionCandidatesAdminClient />
      </AdminStandaloneMain>
    </>
  );
}
