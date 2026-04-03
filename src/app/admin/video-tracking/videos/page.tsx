import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminDashboardService, getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import { getDefaultExamScopeId } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminVideosPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const envScope = getDefaultExamScopeId();
  const { examScopes } = getRepositories();
  const scopes = await examScopes.findAllActive();
  const examScopeId = envScope ?? scopes[0]?.id;
  if (!examScopeId) return <p>無段考 scope</p>;

  const svc = getAdminDashboardService();
  const videos = await svc.getVideoWatchStats(examScopeId);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">影片列表</h1>
      <ul className="mt-6 space-y-2">
        {videos.map((v) => (
          <li key={v.videoId}>
            <Link
              className="interactive-nav font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-2"
              href={`/admin/video-tracking/videos/${v.videoId}`}
            >
              {v.title}
            </Link>
            <span className="ml-2 text-sm text-slate-500">完成率 {v.completionRate}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
