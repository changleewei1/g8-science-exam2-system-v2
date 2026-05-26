import { ReportSettingsClient } from "@/components/admin/ReportSettingsClient";
import { getAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminReportSettingsPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return <ReportSettingsClient />;
}
