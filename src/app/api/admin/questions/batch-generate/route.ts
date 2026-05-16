import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { runExam3BatchQuestionGenerate } from "@/lib/admin/run-exam3-batch-question-generate";
import { getAdminSession } from "@/lib/session";

export const maxDuration = 300;

const bodySchema = z.object({
  videoIds: z.array(z.string().uuid()).min(1).max(60),
  model: z.string().optional(),
});

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openAiKey) {
    return NextResponse.json(
      { success: false, error: "OPENAI_MISSING", message: "尚未設定 OPENAI_API_KEY，無法生成題目。" },
      { status: 400 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { results, completed, failed } = await runExam3BatchQuestionGenerate({
      supabase,
      videoIds: parsed.data.videoIds,
      openAiKey,
      model: parsed.data.model,
    });
    return NextResponse.json({
      success: true,
      completed,
      failed,
      results,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ success: false, error: "BATCH_FAILED", message: msg.slice(0, 400) }, { status: 500 });
  }
}
