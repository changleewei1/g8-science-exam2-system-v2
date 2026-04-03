import { getRepositories } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminReportsHubPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { students, examScopes } = getRepositories();
  const [list, scopes] = await Promise.all([students.findAll(), examScopes.findAllActive()]);
  const scopeId = scopes[0]?.id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">學習分析總覽</h1>
        <p className="mt-2 text-sm text-slate-600">
          以下為學習任務的完成情況與學習表現分析入口（雷達圖、任務完成進度、完成率統計等於各生報告中）
        </p>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2">
        <li>
          <Link
            href="/admin/video-tracking"
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:border-teal-300"
          >
            <span className="font-medium text-slate-900">全班學習進度</span>
            <p className="mt-2 text-sm text-slate-600">依段考範圍檢視影片與測驗整體狀況</p>
          </Link>
        </li>
        <li>
          <Link
            href="/admin/tasks"
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-md transition hover:border-teal-300"
          >
            <span className="font-medium text-slate-900">學習任務設定</span>
            <p className="mt-2 text-sm text-slate-600">建立任務並開啟任務進度追蹤頁</p>
          </Link>
        </li>
      </ul>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">學生學習報告捷徑</h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-md">
          <table className="min-w-[480px] w-full text-left text-sm">
            <thead className="bg-slate-100/90">
              <tr>
                <th className="px-4 py-2 font-semibold">姓名</th>
                <th className="px-4 py-2 font-semibold">班級</th>
                <th className="px-4 py-2 font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{s.className ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Link
                      href={
                        scopeId
                          ? `/admin/students/${s.id}/report?examScopeId=${encodeURIComponent(scopeId)}`
                          : `/admin/students/${s.id}/report`
                      }
                      className="font-medium text-teal-700 underline"
                    >
                      查看學習報告
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
