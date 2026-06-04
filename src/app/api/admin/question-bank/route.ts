import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/** 老師端：題庫列表（含版本；影片專屬題優先） */
export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("videoId")?.trim();

  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("question_bank_items")
    .select(
      "id, question_text, skill_code, version, change_reason, updated_at, video_id, videos ( id, title )",
    )
    .order("updated_at", { ascending: false })
    .limit(120);

  if (videoId) {
    q = q.eq("video_id", videoId);
  } else {
    q = q.not("video_id", "is", null);
  }

  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: "QUERY_FAILED", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
