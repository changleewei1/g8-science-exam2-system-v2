import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "").trim();
  const videoId = (url.searchParams.get("videoId") || "").trim();

  try {
    const supabase = getSupabaseAdmin();
    let q = supabase
      .from("generated_question_candidates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) q = q.eq("status", status);
    if (videoId) q = q.eq("video_id", videoId);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ items: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg.includes("generated_question_candidates") && msg.includes("does not exist")) {
      return NextResponse.json({
        items: [],
        warning: "DB_NOT_READY",
        message: "請執行 migration：20260509130000_teacher_video_management.sql",
      });
    }
    return NextResponse.json({ error: "LOAD_FAILED", detail: msg }, { status: 500 });
  }
}
