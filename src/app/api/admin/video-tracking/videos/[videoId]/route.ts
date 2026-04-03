import { NextResponse } from "next/server";
import { getAdminDashboardService } from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";

type Params = { videoId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { videoId } = await ctx.params;
  const svc = getAdminDashboardService();
  const skills = await svc.getVideoSkillPerformance(videoId);
  return NextResponse.json({ videoId, skillPerformance: skills });
}
