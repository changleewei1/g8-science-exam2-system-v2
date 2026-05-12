import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "pending").trim();
  const videoId = (url.searchParams.get("videoId") || "").trim();

  try {
    const supabase = getSupabaseAdmin();
    let q = supabase
      .from("video_skill_mapping_candidates")
      .select(
        "id, video_id, video_title, unit, suggested_skill_code, suggested_skill_name, confidence, reason, subtitle_excerpt, subtitle_available, status, reviewed_by, reviewed_at, created_at, updated_at",
      )
      .eq("status", status)
      .order("created_at", { ascending: false })
      .limit(500);
    if (videoId) q = q.eq("video_id", videoId);
    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({ candidates: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    if (msg.includes("video_skill_mapping_candidates") && msg.includes("does not exist")) {
      return NextResponse.json({
        candidates: [],
        warning: "DB_NOT_READY",
        message:
          "候選表尚未建立，請先執行 migration：20260506200000_video_skill_mapping_candidates.sql",
      });
    }
    return NextResponse.json({ error: "LOAD_FAILED", detail: msg }, { status: 500 });
  }
}
