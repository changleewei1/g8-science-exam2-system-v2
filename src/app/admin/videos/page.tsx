import Link from "next/link";
import { getAdminSession } from "@/lib/session";
import { VideoManagementCenterClient } from "@/components/admin/VideoManagementCenterClient";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const admin = await getAdminSession();
  if (!admin) {
    return (
      <main className="mx-auto w-full max-w-5xl p-5 sm:p-8">
        <p className="text-slate-700">請先登入老師後台。</p>
        <Link href="/admin/login" className="mt-3 inline-block text-teal-700 underline">
          前往登入
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">老師影片管理中心</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            新增草稿影片、AI skill 候選、候選題目審核後才生效。學生端僅看得到 <code className="rounded bg-slate-100 px-1">is_active</code>{" "}
            且 management 為 <span className="font-mono">active</span> 的影片。
          </p>
        </div>
        <Link href="/admin" className="text-sm font-medium text-teal-700 hover:text-teal-800">
          返回後台首頁
        </Link>
      </header>

      <VideoManagementCenterClient />
    </main>
  );
}
