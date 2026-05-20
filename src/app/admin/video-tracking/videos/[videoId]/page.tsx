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
        <h1 className="text-2xl font-semibold text-slate-50">學習進度追蹤</h1>
        <p className="mt-2 text-lg font-medium text-slate-200">{video?.title ?? "影片"}</p>
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">學習測驗表現</h2>
          <p className="mt-1 text-sm text-slate-400">
            顯示學生在影片測驗中的作答結果與通過情況（依題組技能分類）
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_8px_36px_-16px_rgba(0,0,0,0.45)]">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-white/[0.08]/90 text-slate-300">
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
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    目前尚無測驗作答資料
                  </td>
                </tr>
              ) : (
                skills.map((s) => (
                  <tr key={s.skillCode} className="border-t border-white/10">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{s.skillCode}</td>
                    <td className="px-4 py-3 text-slate-50">{s.skillName}</td>
                    <td className="px-4 py-3 text-slate-300">{s.attempts}</td>
                    <td className="px-4 py-3 text-slate-200">{s.correctRate}%</td>
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
