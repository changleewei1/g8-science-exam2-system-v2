import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "@/lib/exam3-scope";
import { getAdminSession } from "@/lib/session";

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const status = (url.searchParams.get("status") || "").trim();
  const videoId = (url.searchParams.get("videoId") || "").trim();
  const skillCode = (url.searchParams.get("skillCode") || "").trim();
  const examScopeId = (url.searchParams.get("examScopeId") || "").trim();
  const unitTitle = (url.searchParams.get("unitTitle") || "").trim();

  try {
    const supabase = getSupabaseAdmin();

    let videoIdFilter: string[] | null = null;
    if (examScopeId || unitTitle) {
      let unitQuery = supabase.from("scope_units").select("id");
      if (examScopeId) unitQuery = unitQuery.eq("exam_scope_id", examScopeId);
      if (unitTitle) unitQuery = unitQuery.eq("unit_title", unitTitle);
      const { data: units, error: uErr } = await unitQuery;
      if (uErr) throw uErr;
      const unitIds = (units ?? []).map((u) => u.id as string);
      if (unitIds.length === 0) {
        return NextResponse.json({ items: [] });
      }
      const { data: vids, error: vErr } = await supabase.from("videos").select("id").in("unit_id", unitIds);
      if (vErr) throw vErr;
      videoIdFilter = (vids ?? []).map((v) => v.id as string);
      if (videoIdFilter.length === 0) {
        return NextResponse.json({ items: [] });
      }
    }

    let q = supabase
      .from("generated_question_candidates")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (status) q = q.eq("status", status);
    if (videoId) q = q.eq("video_id", videoId);
    if (skillCode) q = q.eq("skill_code", skillCode);
    if (videoIdFilter) q = q.in("video_id", videoIdFilter);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json({
      items: data ?? [],
      meta: {
        exam3ScopeId: G8_SPRING_TERM_EXAM3_SCOPE_ID,
      },
    });
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
