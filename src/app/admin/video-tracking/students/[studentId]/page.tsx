import { redirect } from "next/navigation";
import { getAdminDashboardService } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ examScopeId?: string }>;
};

export default async function AdminStudentDetailPage({ params, searchParams }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");
  const { studentId } = await params;
  const sp = await searchParams;
  const examScopeId = sp.examScopeId;
  if (!examScopeId) {
    return (
      <div className="rounded-2xl border border-amber-200/90 bg-amber-50/90 p-6 text-amber-950 shadow-md">
        <p className="font-medium text-slate-50">無法顯示此頁面</p>
        <p className="mt-2 text-sm text-slate-300">
          請由「學生學習總覽」進入，以帶入正確的學習範圍。
        </p>
        <Link
          href="/admin/video-tracking"
          className="interactive-nav mt-4 inline-block text-sm font-medium text-cyan-200 underline underline-offset-2"
        >
          前往學習進度追蹤
        </Link>
      </div>
    );
  }

  const svc = getAdminDashboardService();
  const detail = await svc.getStudentDetail(studentId, examScopeId);
  if (!detail) {
    return (
      <p className="text-slate-300">
        找不到學生資料。{" "}
        <Link href="/admin/video-tracking" className="font-medium text-cyan-300 underline">
          返回總覽
        </Link>
      </p>
    );
  }

  const videoMap = new Map(
    (detail.videos as { id: string; title: string }[]).map((v) => [v.id, v.title]),
  );

  const st = detail.student as { name: string; student_code?: string; class_name?: string | null };

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/video-tracking"
          className="interactive-nav text-sm font-medium text-cyan-300 underline-offset-4 hover:underline"
        >
          ← 返回學生學習總覽
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-50">學習進度追蹤</h1>
        <p className="mt-2 text-lg font-medium text-slate-200">{st.name}</p>
        {st.class_name ? (
          <p className="text-sm text-slate-400">{st.class_name} 班</p>
        ) : null}
      </div>

      <section className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-5 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold text-slate-50">影片學習進度</h2>
        <p className="mt-1 text-sm text-slate-400">
          顯示學生影片觀看完成情況（達 90% 視為完成）
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {(detail.progress as { video_id: string; completion_rate: number; is_completed: boolean }[]).map(
            (p) => (
              <li
                key={p.video_id}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5 ring-1 ring-white/10"
              >
                <span className="font-medium text-slate-50">{videoMap.get(p.video_id) ?? "影片"}</span>
                <span className="text-slate-300">
                  觀看進度 {Number(p.completion_rate).toFixed(0)}%
                  {p.is_completed ? (
                    <span className="ml-2 text-cyan-200">· 已完成</span>
                  ) : (
                    <span className="ml-2 text-slate-500">· 進行中</span>
                  )}
                </span>
              </li>
            ),
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.06] backdrop-blur-md p-5 shadow-md sm:p-6">
        <h2 className="text-lg font-semibold text-slate-50">學習測驗表現</h2>
        <p className="mt-1 text-sm text-slate-400">
          顯示學生在影片測驗中的作答結果與通過情況
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          {(detail.attempts as { quiz_id: string; score: number; is_passed: boolean }[]).length === 0 ? (
            <li className="text-slate-400">目前尚無測驗紀錄</li>
          ) : (
            (detail.attempts as { quiz_id: string; score: number; is_passed: boolean }[]).map((a, i) => (
              <li
                key={i}
                className="rounded-xl bg-white/[0.04] px-3 py-2.5 text-slate-200 ring-1 ring-white/10"
              >
                得分 {a.score} 分 ·{" "}
                {a.is_passed ? (
                  <span className="font-medium text-cyan-200">已通過</span>
                ) : (
                  <span className="font-medium text-amber-900">未通過</span>
                )}
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-50">學習成效統計</h2>
        <p className="mt-1 text-sm text-slate-400">
          如需圖表與家長分享，請至該生「查看學習報告」。
        </p>
        <Link
          href={`/admin/students/${studentId}/report?examScopeId=${encodeURIComponent(examScopeId)}`}
          className="interactive-btn mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white shadow-md"
        >
          查看學習報告
        </Link>
      </section>
    </div>
  );
}
