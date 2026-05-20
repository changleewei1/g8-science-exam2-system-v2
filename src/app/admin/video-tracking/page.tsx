import { redirect } from "next/navigation";
import { TeacherVideoTrackingHomeClient } from "@/components/admin/TeacherVideoTrackingHomeClient";
import { getAdminSession } from "@/lib/session";

export default async function AdminVideoTrackingPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return <TeacherVideoTrackingHomeClient />;
}
