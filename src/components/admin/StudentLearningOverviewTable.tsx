import type { StudentOverviewRow } from "@/domain/services/admin-dashboard-service";
import { StudentListRowActions } from "@/components/admin/StudentListRowActions";

type Props = {
  rows: StudentOverviewRow[];
  examScopeId: string;
};

function formatLastLearned(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("zh-TW", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function StudentLearningOverviewTable({ rows, examScopeId }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/90 bg-white shadow-md">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="bg-slate-100/90 text-slate-700">
          <tr>
            <th className="px-4 py-3 font-semibold">學生姓名</th>
            <th className="px-4 py-3 font-semibold">任務完成率</th>
            <th className="px-4 py-3 font-semibold">影片完成度</th>
            <th className="px-4 py-3 font-semibold">測驗表現</th>
            <th className="px-4 py-3 font-semibold whitespace-nowrap">最後學習時間</th>
            <th className="px-4 py-3 font-semibold">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-slate-600">
                <p className="font-medium text-slate-800">目前尚無學習資料</p>
                <p className="mt-2 text-sm text-slate-600">
                  待學生開始觀看影片與完成測驗後，系統將自動產生學習紀錄
                </p>
              </td>
            </tr>
          ) : (
            rows.map((s) => (
              <tr key={s.studentId} className="border-t border-slate-100 align-top">
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{s.name}</span>
                  <span className="mt-0.5 block font-mono text-xs text-slate-500">{s.studentCode}</span>
                  {s.className ? (
                    <span className="mt-0.5 block text-xs text-slate-500">{s.className} 班</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {s.taskCompletionRate == null ? "—" : `${s.taskCompletionRate}%`}
                </td>
                <td className="px-4 py-3 text-slate-800">{s.videoCompletionRate}%</td>
                <td className="px-4 py-3 text-slate-800">{s.quizPassRate}%</td>
                <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                  {formatLastLearned(s.lastActivityAt)}
                </td>
                <td className="px-4 py-3">
                  <StudentListRowActions studentId={s.studentId} examScopeId={examScopeId} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
