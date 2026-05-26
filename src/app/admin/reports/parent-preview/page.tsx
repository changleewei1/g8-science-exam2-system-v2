import { ParentReportPreviewClient } from "@/components/admin/ParentReportPreviewClient";
import { getAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminParentReportPreviewPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return <ParentReportPreviewClient />;
}
