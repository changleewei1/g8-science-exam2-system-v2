import { StudentLearningOverviewTable } from "@/components/admin/StudentLearningOverviewTable";
import { getAdminDashboardService } from "@/infrastructure/composition";
import { getRepositories } from "@/infrastructure/composition";
import { getDefaultExamScopeId } from "@/lib/constants";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminStudentsIndexPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const envScope = getDefaultExamScopeId();
  const { examScopes } = getRepositories();
  const scopes = await examScopes.findAllActive();
  const examScopeId = envScope ?? scopes[0]?.id ?? null;

  const overview =
    examScopeId != null ? await getAdminDashboardService().getOverview(examScopeId) : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">學生學習總覽</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          查看每位學生的影片觀看進度與學習表現
        </p>
      </div>

      {!examScopeId ? (
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
      ) : (
        <StudentLearningOverviewTable rows={overview} examScopeId={examScopeId} />
      )}
    </div>
  );
}
