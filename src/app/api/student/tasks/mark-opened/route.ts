import { NextResponse } from "next/server";
import { z } from "zod";
import { getLearningTaskService } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  taskId: z.string().uuid(),
});

export async function POST(req: Request) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  const svc = getLearningTaskService();
  await svc.markStudentTaskOpened(session.studentId, parsed.data.taskId);
  return NextResponse.json({ ok: true });
}
