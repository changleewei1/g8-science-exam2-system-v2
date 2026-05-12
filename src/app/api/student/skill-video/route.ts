import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getDefaultExamScopeId } from "@/lib/constants";
import { getStudentSession } from "@/lib/session";

type VideoRow = {
  id: string;
  title: string;
  unit_id: string;
  sort_order: number;
  is_active: boolean;
  management_status?: string;
};

type ScopeUnitRow = {
  id: string;
  exam_scope_id: string;
  sort_order: number;
};

function normalizeSkillCode(raw: string | null): string {
  return (raw ?? "").trim().toUpperCase();
}

async function getPreferredScopeId(supabase: ReturnType<typeof getSupabaseAdmin>): Promise<string | null> {
  let preferredScopeId = getDefaultExamScopeId() ?? null;
  if (!preferredScopeId) {
    const { data: scopes, error: scErr } = await supabase
      .from("exam_scopes")
      .select("id")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);
    if (scErr) throw scErr;
    preferredScopeId = scopes?.[0]?.id ?? null;
  }
  return preferredScopeId;
}

function pickVideoByScopeAndOrder(
  videoRows: VideoRow[],
  scopeUnits: ScopeUnitRow[],
  preferredScopeId: string | null,
): VideoRow | null {
  if (!videoRows.length) return null;
  const scopeUnitMap = new Map(scopeUnits.map((u) => [u.id, u]));
  const rankRows = videoRows
    .map((v) => {
      const su = scopeUnitMap.get(v.unit_id);
      const inPreferredScope =
        preferredScopeId && su ? su.exam_scope_id === preferredScopeId : false;
      return {
        ...v,
        inPreferredScope,
        unitSort: su?.sort_order ?? 9999,
        videoSort: v.sort_order ?? 9999,
      };
    })
    .sort((a, b) => {
      if (a.inPreferredScope !== b.inPreferredScope) return a.inPreferredScope ? -1 : 1;
      if (a.unitSort !== b.unitSort) return a.unitSort - b.unitSort;
      if (a.videoSort !== b.videoSort) return a.videoSort - b.videoSort;
      return a.id.localeCompare(b.id);
    });
  return rankRows[0] ?? null;
}

export async function GET(req: Request) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const url = new URL(req.url);
  const skillCode = normalizeSkillCode(url.searchParams.get("skillCode"));
  if (!skillCode) {
    return NextResponse.json(
      { error: "MISSING_SKILL_CODE", video: null, message: "請提供 skillCode。" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    const { data: existsTag, error: tagErr } = await supabase
      .from("skill_tags")
      .select("code")
      .eq("code", skillCode)
      .maybeSingle();
    if (tagErr) throw tagErr;

    const { data: existsBank, error: bankErr } = await supabase
      .from("question_bank_items")
      .select("id")
      .eq("skill_code", skillCode)
      .limit(1)
      .maybeSingle();
    if (bankErr) throw bankErr;

    if (!existsTag && !existsBank) {
      return NextResponse.json({
        video: null,
        message: "找不到此能力代碼，請先回到技能樹確認。",
      });
    }

    const { data: tagRows, error: vsErr } = await supabase
      .from("video_skill_tags")
      .select("video_id, created_at")
      .eq("skill_code", skillCode);
    if (vsErr) throw vsErr;
    let candidateVideoIds = (tagRows ?? []).map((r) => r.video_id);

    // 回退策略：若 video_skill_tags 尚未建立，改用 quiz_questions.skill_code 反查影片
    if (candidateVideoIds.length === 0) {
      const { data: qqRows, error: qqErr } = await supabase
        .from("quiz_questions")
        .select("quiz_id")
        .eq("skill_code", skillCode);
      if (qqErr) throw qqErr;
      const quizIds = Array.from(new Set((qqRows ?? []).map((r) => r.quiz_id)));
      if (quizIds.length > 0) {
        const { data: quizRows, error: qErr } = await supabase
          .from("quizzes")
          .select("id, video_id")
          .in("id", quizIds);
        if (qErr) throw qErr;
        candidateVideoIds = Array.from(new Set((quizRows ?? []).map((q) => q.video_id)));
      }
    }

    if (candidateVideoIds.length === 0) {
      return NextResponse.json({
        video: null,
        message: "目前尚未找到此觀念對應的影片，請先回到學習單元選擇影片。",
      });
    }

    const { data: videos, error: vErr } = await supabase
      .from("videos")
      .select("id, title, unit_id, sort_order, is_active, management_status")
      .in("id", candidateVideoIds);
    if (vErr) throw vErr;
    const videoRows = ((videos ?? []) as VideoRow[]).filter(
      (v) => v.is_active && (v.management_status ?? "active") === "active",
    );
    if (!videoRows.length) {
      return NextResponse.json({
        video: null,
        message: "目前尚未找到此觀念對應的影片，請先回到學習單元選擇影片。",
      });
    }

    const unitIds = Array.from(new Set(videoRows.map((v) => v.unit_id)));
    const { data: scopeUnits, error: suErr } = await supabase
      .from("scope_units")
      .select("id, exam_scope_id, sort_order")
      .in("id", unitIds);
    if (suErr) throw suErr;

    const preferredScopeId = await getPreferredScopeId(supabase);
    const picked = pickVideoByScopeAndOrder(videoRows, (scopeUnits ?? []) as ScopeUnitRow[], preferredScopeId);
    if (!picked) {
      return NextResponse.json({
        video: null,
        message: "目前尚未找到此觀念對應的影片，請先回到學習單元選擇影片。",
      });
    }
    return NextResponse.json({
      video: {
        id: picked.id,
        title: picked.title,
        unit_id: picked.unit_id,
        url: `/student/video/${picked.id}`,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json(
      {
        error: "LOOKUP_FAILED",
        detail: msg,
        video: null,
        message: "系統暫時無法查詢對應影片，請稍後再試。",
      },
      { status: 500 },
    );
  }
}
