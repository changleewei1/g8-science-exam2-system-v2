import Link from "next/link";
import { AdminInlineNavLink, AdminStandaloneHeader, AdminStandaloneMain } from "@/components/admin/AdminStandaloneHeader";
import { getAdminSession } from "@/lib/session";
import { VideoManagementCenterClient } from "@/components/admin/VideoManagementCenterClient";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const admin = await getAdminSession();
  if (!admin) {
    return (
      <AdminStandaloneMain narrow>
        <p className="text-slate-600">請先登入老師後台。</p>
        <Link href="/admin/login" className="mt-3 inline-block text-sm text-cyan-700 underline">
          前往登入
        </Link>
      </AdminStandaloneMain>
    );
  }

  return (
    <>
      <AdminStandaloneHeader
        title="老師影片管理中心"
        right={<AdminInlineNavLink href="/admin">返回後台首頁</AdminInlineNavLink>}
      />
      <AdminStandaloneMain>
        <p className="mb-6 max-w-3xl text-sm text-slate-400">
          新增草稿影片、AI skill 候選、候選題目審核後才生效。學生端僅看得到 <code className="rounded bg-slate-50 px-1">is_active</code> 且 management 為{" "}
          <span className="font-mono">active</span> 的影片。
        </p>
        <VideoManagementCenterClient />
      </AdminStandaloneMain>
    </>
  );
}
