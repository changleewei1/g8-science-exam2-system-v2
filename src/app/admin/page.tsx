import { redirect } from "next/navigation";
import { AdminHomeDashboard } from "@/components/admin/AdminHomeDashboard";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return <AdminHomeDashboard />;
}
