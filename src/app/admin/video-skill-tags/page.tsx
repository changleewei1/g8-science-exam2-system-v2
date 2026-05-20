import { getAdminSession } from "@/lib/session";
import { AdminInlineNavLink, AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { VideoSkillTagsManagerClient } from "@/components/admin/VideoSkillTagsManagerClient";

export default async function AdminVideoSkillTagsPage() {
  const admin = await getAdminSession();
  if (!admin) {
    return (
      <>
        <AdminStandaloneHeader title="影片技能對應管理" narrow />
        <AdminStandaloneMain narrow>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-slate-50">影片技能對應管理</h1>
            <p className="mt-2 text-sm text-slate-300">需要老師登入後才能使用。</p>
            <div className="mt-4">
              <AdminInlineNavLink href="/admin">返回後台首頁</AdminInlineNavLink>
            </div>
          </div>
        </AdminStandaloneMain>
      </>
    );
  }

  return (
    <>
      <AdminStandaloneHeader
        title="影片技能對應管理"
        right={<AdminInlineNavLink href="/admin">返回後台首頁</AdminInlineNavLink>}
      />
      <AdminStandaloneMain>
        <p className="mb-5 text-sm text-slate-400">手動管理 `video_skill_tags`（不會刪除影片或題庫）。</p>
        <VideoSkillTagsManagerClient />
      </AdminStandaloneMain>
    </>
  );
}
