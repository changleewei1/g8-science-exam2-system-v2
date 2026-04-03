import { NextResponse } from "next/server";
import { getAdminTaskProgressDetailUseCase } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";

type Params = { taskId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { taskId } = await ctx.params;
  const uc = getAdminTaskProgressDetailUseCase();
  const detail = await uc.execute(taskId);
  if (!detail) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
