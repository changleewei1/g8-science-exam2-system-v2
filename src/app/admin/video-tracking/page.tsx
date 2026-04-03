import { getAdminDashboardService } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { getDefaultExamScopeId } from "@/lib/constants";
import { getRepositories } from "@/infrastructure/composition";
import { StudentLearningOverviewTable } from "@/components/admin/StudentLearningOverviewTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminVideoTrackingPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const envScope = getDefaultExamScopeId();
  const { examScopes } = getRepositories();
  const scopes = await examScopes.findAllActive();
  const examScopeId = envScope ?? scopes[0]?.id;
  const scopeTitle = scopes.find((s) => s.id === examScopeId)?.title ?? null;

  if (!examScopeId) {
    return (
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-6 text-amber-950 shadow-md">
        <p className="font-medium text-slate-900">尚未完成系統設定</p>
        <p className="mt-2 text-sm text-slate-700">
          請先完成初始化後，即可開始使用此功能
        </p>
        <Link
          href="/admin"
          className="interactive-nav mt-4 inline-block text-sm font-medium text-teal-800 underline underline-offset-2"
        >
          返回後台首頁
        </Link>
      </div>
    );
  }

  const svc = getAdminDashboardService();
  const students = await svc.getOverview(examScopeId);
  const videos = await svc.getVideoWatchStats(examScopeId);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">學生學習總覽</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          查看每位學生的影片觀看進度與學習表現
        </p>
        {scopeTitle ? (
          <p className="mt-2 text-xs text-slate-500">
            目前範圍：<span className="font-medium text-slate-700">{scopeTitle}</span>
          </p>
        ) : null}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">學生列表</h2>
        <p className="text-sm text-slate-600">
          可依班級檢視學生；若需依任務篩選，請至「學習任務」查看任務專屬進度。
        </p>
        <StudentLearningOverviewTable rows={students} examScopeId={examScopeId} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">各影片學習狀況</h2>
        <p className="text-sm text-slate-600">檢視單支影片的全班完成比例與後續操作</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-md">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">影片名稱</th>
                <th className="px-4 py-3 font-semibold">完成人數</th>
                <th className="px-4 py-3 font-semibold">全班完成率</th>
                <th className="px-4 py-3 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {videos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-600">
                    <p className="font-medium text-slate-800">目前尚無學習資料</p>
                    <p className="mt-2 text-sm">
                      待學生開始觀看影片與完成測驗後，系統將自動產生學習紀錄
                    </p>
                  </td>
                </tr>
              ) : (
                videos.map((v) => (
                  <tr key={v.videoId} className="border-t border-slate-100">
                    <td className="px-4 py-3 text-slate-900">{v.title}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {v.completedCount}/{v.totalStudents}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{v.completionRate}%</td>
                    <td className="px-4 py-3">
                      <a
                        className="interactive-nav font-medium text-teal-700 underline decoration-teal-700/40 underline-offset-2"
                        href={`/admin/video-tracking/videos/${v.videoId}`}
                      >
                        查看進度
                      </a>
                    </td>
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
