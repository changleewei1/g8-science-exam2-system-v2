import { redirect } from "next/navigation";
import { VideoSkillReviewClient } from "@/components/admin/VideoSkillReviewClient";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminVideoSkillReviewPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">影片技能候選審核</h1>
        <p className="mt-2 text-sm text-slate-600">
          這裡只審核 AI 候選，不會直接覆蓋正式標籤。只有「核准」後才會寫入 video_skill_tags。
        </p>
      </header>
      <VideoSkillReviewClient />
    </div>
  );
}
