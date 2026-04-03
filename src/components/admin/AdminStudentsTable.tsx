import type { Student } from "@/domain/entities/student";
import { StudentListRowActions } from "@/components/admin/StudentListRowActions";

type Props = {
  students: Student[];
  examScopeId: string | null;
};

export function AdminStudentsTable({ students, examScopeId }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-[640px] w-full text-left text-sm">
        <thead className="bg-slate-100 text-slate-700">
          <tr>
            <th className="px-3 py-2 sm:px-4">學號</th>
            <th className="px-3 py-2 sm:px-4">姓名</th>
            <th className="px-3 py-2 sm:px-4">班級</th>
            <th className="px-3 py-2 sm:px-4">操作</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-t border-slate-100 align-top">
              <td className="px-3 py-3 font-mono text-slate-900 sm:px-4">{s.studentCode}</td>
              <td className="px-3 py-3 text-slate-900 sm:px-4">{s.name}</td>
              <td className="px-3 py-3 text-slate-600 sm:px-4">{s.className ?? "—"}</td>
              <td className="px-3 py-3 sm:px-4">
                <StudentListRowActions studentId={s.id} examScopeId={examScopeId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
