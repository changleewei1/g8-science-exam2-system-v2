import type { Student } from "@/domain/entities/student";
import { StudentListRowActions } from "@/components/admin/StudentListRowActions";

type Props = {
  students: Student[];
  examScopeId: string | null;
};

export function AdminStudentsTable({ students, examScopeId }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.06] backdrop-blur-md shadow-[0_8px_32px_-16px_rgba(0,0,0,0.4)]">
      <table className="min-w-[640px] w-full text-left text-sm">
        <thead className="bg-white/[0.08] text-slate-300">
          <tr>
            <th className="px-3 py-2 sm:px-4">學號</th>
            <th className="px-3 py-2 sm:px-4">姓名</th>
            <th className="px-3 py-2 sm:px-4">班級</th>
            <th className="px-3 py-2 sm:px-4">操作</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-t border-white/10 align-top">
              <td className="px-3 py-3 font-mono text-slate-50 sm:px-4">{s.studentCode}</td>
              <td className="px-3 py-3 text-slate-50 sm:px-4">{s.name}</td>
              <td className="px-3 py-3 text-slate-400 sm:px-4">{s.className ?? "—"}</td>
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
