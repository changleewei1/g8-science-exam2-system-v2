import { redirect } from "next/navigation";
import { VideoSkillReviewClient } from "@/components/admin/VideoSkillReviewClient";
import { AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminVideoSkillReviewPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <AdminStandaloneHeader title="影片技能候選審核" />
      <AdminStandaloneMain>
        <p className="mb-6 text-sm text-slate-400">
          這裡只審核 AI 候選，不會直接覆蓋正式標籤。只有「核准」後才會寫入 video_skill_tags。
        </p>
        <VideoSkillReviewClient />
      </AdminStandaloneMain>
    </>
  );
}
