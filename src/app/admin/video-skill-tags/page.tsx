import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { VideoSkillTagsManagerClient } from "@/components/admin/VideoSkillTagsManagerClient";

export default async function AdminVideoSkillTagsPage() {
  const admin = await getAdminSession();
  if (!admin) {
    return (
      <main className="mx-auto w-full max-w-5xl p-5 sm:p-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">影片技能對應管理</h1>
          <p className="mt-2 text-sm text-slate-700">需要老師登入後才能使用。</p>
          <div className="mt-4">
            <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" href="/admin">
              返回後台首頁
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 p-5 sm:p-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">影片技能對應管理</h1>
          <p className="mt-1 text-sm text-slate-600">手動管理 `video_skill_tags`（不會刪除影片或題庫）。</p>
        </div>
        <Link className="text-sm font-medium text-teal-700 hover:text-teal-800" href="/admin">
          返回後台首頁
        </Link>
      </header>

      <VideoSkillTagsManagerClient />
    </main>
  );
}

