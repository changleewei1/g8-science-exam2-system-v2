import { LearningTasksDbMissing } from "@/components/admin/LearningTasksDbMissing";
import { getAdminLearningTaskDetailUseCase } from "@/infrastructure/composition";
import {
  getSupabaseErrorMessage,
  looksLikeMissingLearningTasksTable,
} from "@/lib/supabase-user-message";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = { taskId: string };

export default async function AdminTaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{ created?: string }>;
}) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { taskId } = await params;
  const sp = await searchParams;
  const uc = getAdminLearningTaskDetailUseCase();

  let detail: Awaited<ReturnType<typeof uc.execute>>;
  try {
    detail = await uc.execute(taskId);
  } catch (e) {
    const msg = getSupabaseErrorMessage(e);
    if (looksLikeMissingLearningTasksTable(msg)) {
      return <LearningTasksDbMissing technicalDetail={msg} />;
    }
    return (
      <div className="rounded-2xl border border-red-200/90 bg-red-50/90 p-6 text-red-900 shadow-md">
        <p className="font-medium">無法載入任務資料</p>
        <p className="mt-2 text-sm">請稍後再試，或返回任務列表重新選擇。</p>
        <details className="mt-4 rounded-lg border border-red-200/60 bg-white/60 p-3 text-xs">
          <summary className="cursor-pointer font-medium">錯誤詳情（選讀）</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap">{msg}</pre>
        </details>
        <Link
          href="/admin/tasks"
          className="interactive-nav mt-4 inline-block text-sm font-medium text-teal-800 underline underline-offset-2"
        >
          返回學習任務設定
        </Link>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-700 shadow-md">
        <p>找不到此學習任務。</p>
        <Link
          href="/admin/tasks"
          className="interactive-nav mt-3 inline-block text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
        >
          返回學習任務設定
        </Link>
      </div>
    );
  }

  const { task, videos, students } = detail;
  const sum = students.reduce((a, s) => a + s.completionRate, 0);
  const overall = students.length > 0 ? Math.round((sum / students.length) * 10) / 10 : 0;
  const assigneeText =
    task.assignmentMode === "students"
      ? `已選 ${task.assigneeStudentIds.length} 位學生`
      : `${task.className} 班（整班）`;

  return (
    <div className="space-y-10">
      {sp.created === "1" ? (
        <div className="rounded-xl border border-teal-200 bg-teal-50/90 px-4 py-3 text-sm text-teal-900">
          已成功建立學習任務
        </div>
      ) : null}

      <div>
        <Link
          href="/admin/tasks"
          className="interactive-nav text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
        >
          ← 返回學習任務設定
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">任務內容</h1>
        <p className="mt-2 text-xl font-semibold text-slate-900">{task.title}</p>
        {task.description ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-700">{task.description}</p>
        ) : null}
        <dl className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">指派對象</dt>
            <dd className="font-medium text-slate-900">{assigneeText}</dd>
          </div>
          <div>
            <dt className="text-slate-500">期間</dt>
            <dd>
              {task.startDate} — {task.endDate}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">任務狀態</dt>
            <dd>{task.isActive ? "已啟用" : "未啟用（學生端不顯示）"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">整體完成率（全班平均）</dt>
            <dd className="font-semibold text-teal-900">{overall}%</dd>
          </div>
        </dl>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/admin/tasks/${taskId}/progress`}
            className="inline-flex min-h-10 items-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-md"
          >
            查看進度
          </Link>
          <Link
            href={`/admin/tasks/${taskId}/edit`}
            className="inline-flex min-h-10 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm"
          >
            編輯任務
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">指定影片清單</h2>
        <p className="text-sm text-slate-600">含單元、技能代碼與是否已設定測驗</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-md">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">順序（天）</th>
                <th className="px-4 py-3 font-semibold">單元</th>
                <th className="px-4 py-3 font-semibold">影片名稱</th>
                <th className="px-4 py-3 font-semibold">skill_code</th>
                <th className="px-4 py-3 font-semibold">測驗</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((v) => (
                <tr key={`${v.videoId}-${v.dayIndex}`} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-slate-800">第 {v.dayIndex} 天</td>
                  <td className="px-4 py-3 text-slate-700">{v.unitTitle}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{v.title}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {v.skillCodes.length ? v.skillCodes.join("、") : "—"}
                  </td>
                  <td className="px-4 py-3">{v.hasQuiz ? "已綁定" : "未綁定"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">學生完成概況</h2>
        <p className="text-sm text-slate-600">詳細測驗與時間請至「查看進度」或個別學習報告</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-md">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100/90 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">學號</th>
                <th className="px-4 py-3 font-semibold">學生姓名</th>
                <th className="px-4 py-3 font-semibold">影片進度</th>
                <th className="px-4 py-3 font-semibold">任務完成率</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-600">
                    尚無符合的學生名單
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.studentId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-slate-700">{s.studentCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {s.completedCount}/{s.totalVideos}
                    </td>
                    <td className="px-4 py-3 text-slate-800">{s.completionRate}%</td>
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
