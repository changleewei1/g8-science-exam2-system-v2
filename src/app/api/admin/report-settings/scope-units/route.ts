import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

function parseUnitSort(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  const examScopeId = new URL(req.url).searchParams.get("examScopeId")?.trim();
  if (!examScopeId) {
    return NextResponse.json(
      { ok: false, error: "VALIDATION_ERROR", message: "請提供 query examScopeId" },
      { status: 400 },
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: units, error } = await supabase
      .from("scope_units")
      .select("id, unit_title, sort_order")
      .eq("exam_scope_id", examScopeId);
    if (error) throw new Error(error.message);
    const rows = [...(units ?? [])].sort(
      (a, b) =>
        parseUnitSort((a as { sort_order: unknown }).sort_order, 9999) -
        parseUnitSort((b as { sort_order: unknown }).sort_order, 9999),
    );
    const unitIds = rows.map((u) => (u as { id: string }).id);
    if (unitIds.length === 0) {
      return NextResponse.json({ ok: true, units: [] });
    }

    const { data: videos } = await supabase.from("videos").select("id, unit_id").in("unit_id", unitIds);
    const videoRows = (videos ?? []) as { id: string; unit_id: string }[];
    const videosByUnit = new Map<string, string[]>();
    const allVideoIds: string[] = [];
    for (const v of videoRows) {
      allVideoIds.push(v.id);
      const arr = videosByUnit.get(v.unit_id) ?? [];
      arr.push(v.id);
      videosByUnit.set(v.unit_id, arr);
    }

    const skillCodesByVideo = new Map<string, Set<string>>();
    if (allVideoIds.length > 0) {
      const chunk = 400;
      for (let i = 0; i < allVideoIds.length; i += chunk) {
        const part = allVideoIds.slice(i, i + chunk);
        const { data: tags } = await supabase
          .from("video_skill_tags")
          .select("video_id, skill_code")
          .in("video_id", part);
        for (const t of tags ?? []) {
          const row = t as { video_id: string; skill_code: string | null };
          if (!row.skill_code?.trim()) continue;
          let set = skillCodesByVideo.get(row.video_id);
          if (!set) {
            set = new Set();
            skillCodesByVideo.set(row.video_id, set);
          }
          set.add(row.skill_code.trim());
        }
      }
    }

    const unitsOut = rows.map((u) => {
      const id = (u as { id: string }).id;
      const title = String((u as { unit_title: string }).unit_title ?? "").trim() || "（未命名單元）";
      const vids = videosByUnit.get(id) ?? [];
      const skillSet = new Set<string>();
      for (const vid of vids) {
        const sc = skillCodesByVideo.get(vid);
        if (sc) for (const c of sc) skillSet.add(c);
      }
      return {
        id,
        title,
        videoCount: vids.length,
        skillCount: skillSet.size,
      };
    });

    return NextResponse.json({
      ok: true,
      units: unitsOut,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "LOAD_FAILED", message }, { status: 500 });
  }
}
