import { NextResponse } from "next/server";
import { getStudentAdminService } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";

function escapeCsv(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const svc = getStudentAdminService();
  const students = await svc.listForAdmin();
  const header = ["學號", "姓名", "班級", "年級", "密碼狀態", "建立時間"];
  const lines = [
    header.join(","),
    ...students.map((r) =>
      [
        escapeCsv(r.studentCode),
        escapeCsv(r.name),
        escapeCsv(r.className ?? ""),
        String(r.grade),
        escapeCsv(r.passwordStatus),
        escapeCsv(r.createdAt),
      ].join(","),
    ),
  ];
  const bom = "\uFEFF";
  const csv = bom + lines.join("\r\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="students-export.csv"`,
    },
  });
}
