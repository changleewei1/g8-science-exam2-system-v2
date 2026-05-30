import { NextResponse } from "next/server";
import { loadTaskVideoPickerUnitsByExamScope } from "@/lib/admin/task-videos-by-exam-scope";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const examScopeId = searchParams.get("examScopeId")?.trim();
  if (!examScopeId) {
    return NextResponse.json({ error: "MISSING_EXAM_SCOPE_ID" }, { status: 400 });
  }

  try {
    const units = await loadTaskVideoPickerUnitsByExamScope(examScopeId);
    const totalVideos = units.reduce((n, u) => n + u.videos.length, 0);
    return NextResponse.json({ units, totalVideos });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "LOAD_FAILED";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
