import { NextResponse } from "next/server";
import {
  getCreateLearningTaskUseCase,
  getListLearningTasksUseCase,
} from "@/infrastructure/composition";
import { getAdminSession } from "@/lib/session";
import { createLearningTaskBodySchema } from "@/lib/validation";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  const uc = getListLearningTasksUseCase();
  const tasks = await uc.execute();
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
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
    const uc = getCreateLearningTaskUseCase();
    const result = await uc.execute({
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
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
