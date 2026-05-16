import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 供後台 UI 顯示是否可呼叫 OpenAI（不在回應中洩漏金鑰） */
export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({
    openAiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
  });
}
