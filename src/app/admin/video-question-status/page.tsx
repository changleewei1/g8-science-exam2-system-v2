import { redirect } from "next/navigation";
import { Exam3VideoQuestionStatusClient } from "@/components/admin/Exam3VideoQuestionStatusClient";
import { AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Exam3VideoQuestionStatusPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <AdminStandaloneHeader title="影片題目狀態" narrow />
      <AdminStandaloneMain narrow>
        <Exam3VideoQuestionStatusClient />
      </AdminStandaloneMain>
    </>
  );
}
