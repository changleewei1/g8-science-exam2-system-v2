import { NextResponse } from "next/server";
import { getStudentAdminService } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import { adminImportStudentsBodySchema } from "@/lib/validation";

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = adminImportStudentsBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const svc = getStudentAdminService();
    const created = await svc.importStudents(parsed.data.rows);
    return NextResponse.json({ created, count: created.length }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
