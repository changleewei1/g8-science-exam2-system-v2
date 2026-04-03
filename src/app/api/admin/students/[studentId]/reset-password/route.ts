import { NextResponse } from "next/server";
import { getStudentAdminService } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";

type Params = { studentId: string };

export async function POST(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { studentId } = await ctx.params;
  try {
    const svc = getStudentAdminService();
    const { plainPassword } = await svc.resetPassword(studentId);
    return NextResponse.json({ ok: true, plainPassword });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
