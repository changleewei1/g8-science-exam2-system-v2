import { redirect } from "next/navigation";
import { AnnouncementEditorClient } from "@/components/admin/AnnouncementEditorClient";
import { getHomeAnnouncementForAdmin } from "@/lib/system-announcement";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminAnnouncementPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const initial = await getHomeAnnouncementForAdmin();

  return <AnnouncementEditorClient initial={initial} />;
}
