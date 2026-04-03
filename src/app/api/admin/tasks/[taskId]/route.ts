import { NextResponse } from "next/server";
import {
  getAdminLearningTaskDetailUseCase,
  getUpdateLearningTaskUseCase,
} from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import { createLearningTaskBodySchema } from "@/lib/validation";

type Params = { taskId: string };

export async function GET(_req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const { taskId } = await ctx.params;
  const uc = getAdminLearningTaskDetailUseCase();
  const detail = await uc.execute(taskId);
  if (!detail) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json(detail);
}

export async function PATCH(req: Request, ctx: { params: Promise<Params> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { taskId } = await ctx.params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = createLearningTaskBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }
  const b = parsed.data;
  try {
    const uc = getUpdateLearningTaskUseCase();
    await uc.execute(taskId, {
      title: b.title,
      description: b.description ?? null,
      startDate: b.startDate,
      endDate: b.endDate,
      className: b.className,
      videos: b.videos,
      assignmentMode: b.assignmentMode,
      studentIds: b.studentIds,
      isActive: b.isActive,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
