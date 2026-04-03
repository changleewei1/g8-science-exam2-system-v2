import { NextResponse } from "next/server";
import { getCreateStudentReportLinkUseCase } from "@/infrastructure/composition";
import { publicReportPageUrl } from "@/lib/public-url";
import { getAdminSession } from "@/lib/session";
import { reportLinkBodySchema } from "@/lib/validation";

type Params = { studentId: string };

export async function POST(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { studentId } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = reportLinkBodySchema.safeParse(json ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const uc = getCreateStudentReportLinkUseCase();
    const { token, created } = await uc.execute({
      studentId,
      taskId: body.taskId ?? undefined,
      expiresInDays: body.expiresInDays ?? undefined,
    });
    let shareUrl: string;
    try {
      shareUrl = publicReportPageUrl(req, token);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        {
          error: "PUBLIC_BASE_URL_MISSING",
          detail:
            detail.includes("PUBLIC_BASE_URL_MISSING") || detail.includes("無法推斷")
              ? "系統無法產生分享連結：請設定 APP_BASE_URL 或 NEXT_PUBLIC_APP_URL。"
              : detail,
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true, token, shareUrl, created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("student_report_tokens") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "DB_MISSING_TABLE", detail: "請執行 migration：student_report_tokens" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "SERVER_ERROR", detail: msg }, { status: 500 });
  }
}
