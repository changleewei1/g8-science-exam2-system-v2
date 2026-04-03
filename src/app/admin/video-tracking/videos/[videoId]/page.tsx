import { redirect } from "next/navigation";
import { getAdminDashboardService, getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ videoId: string }> };

export default async function AdminVideoDetailPage({ params }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const { videoId } = await params;
  const { videos } = getRepositories();
  const video = await videos.findById(videoId);
  const svc = getAdminDashboardService();
  const skills = await svc.getVideoSkillPerformance(videoId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">學習進度追蹤</h1>
        <p className="mt-2 text-lg font-medium text-slate-800">{video?.title ?? "影片"}</p>
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">學習測驗表現</h2>
          <p className="mt-1 text-sm text-slate-600">
            顯示學生在影片測驗中的作答結果與通過情況（依題組技能分類）
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-md">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">編號</th>
                <th className="px-4 py-3 font-semibold">能力向度</th>
                <th className="px-4 py-3 font-semibold">作答次數</th>
                <th className="px-4 py-3 font-semibold">答對率</th>
              </tr>
            </thead>
            <tbody>
              {skills.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                    目前尚無測驗作答資料
                  </td>
                </tr>
              ) : (
                skills.map((s) => (
                  <tr key={s.skillCode} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{s.skillCode}</td>
                    <td className="px-4 py-3 text-slate-900">{s.skillName}</td>
                    <td className="px-4 py-3 text-slate-700">{s.attempts}</td>
                    <td className="px-4 py-3 text-slate-800">{s.correctRate}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
