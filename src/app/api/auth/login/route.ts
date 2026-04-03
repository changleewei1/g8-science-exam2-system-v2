import { NextResponse } from "next/server";
import { getLoginAdminUseCase, getLoginStudentUseCase } from "@/infrastructure/composition";
import { loginBodySchema } from "@/lib/validation";
import { setAdminSessionCookie, setStudentSessionCookie } from "@/lib/session";

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = loginBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const body = parsed.data;
  try {
    if (body.role === "student") {
      const uc = getLoginStudentUseCase();
      const result = await uc.execute(body.studentCode, body.password);
      if (!result) {
        return NextResponse.json({ error: "LOGIN_FAILED" }, { status: 401 });
      }
      await setStudentSessionCookie(result.token);
      return NextResponse.json({
        ok: true,
        studentId: result.studentId,
        name: result.name,
      });
    }
    const uc = getLoginAdminUseCase();
    const result = await uc.execute(body.adminSecret);
    if (!result) {
      return NextResponse.json({ error: "LOGIN_FAILED" }, { status: 401 });
    }
    await setAdminSessionCookie(result.token);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("系統設定未完成") || msg.includes("SESSION_SECRET")) {
      return NextResponse.json(
        {
          error: "SERVER_MISCONFIGURED",
          detail: "伺服器尚未完成必要設定（例如 SESSION_SECRET），請聯絡管理員。",
        },
        { status: 503 },
      );
    }
    throw e;
  }
}
