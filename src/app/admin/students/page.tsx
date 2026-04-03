import { StudentManagementClient } from "@/components/admin/StudentManagementClient";
import { getAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminStudentsManagementPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return <StudentManagementClient />;
}
