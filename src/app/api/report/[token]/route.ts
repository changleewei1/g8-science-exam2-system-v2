import { NextResponse } from "next/server";
import { getPublicReportByTokenUseCase } from "@/infrastructure/composition";

type Params = { token: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const { token } = await ctx.params;
  try {
    const uc = getPublicReportByTokenUseCase();
    const report = await uc.execute(token);
    if (!report) {
      return NextResponse.json({ error: "NOT_FOUND_OR_EXPIRED" }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("student_report_tokens") || msg.includes("does not exist")) {
      return NextResponse.json(
        { error: "DB_MISSING_TABLE", detail: "請執行 migration：student_report_tokens" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "SERVER_ERROR" }, { status: 500 });
  }
}
