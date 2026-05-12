import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/session";
import {
  getAdminSkillPracticeOverview,
  type SkillPracticeStatus,
} from "@/lib/skill-practice-summary";

const STATUS_SET = new Set<SkillPracticeStatus>(["尚未開始", "練習中", "建議加強", "已精熟"]);

export async function GET(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const url = new URL(req.url);
  const scopeId = url.searchParams.get("scopeId");
  if (!scopeId) {
    return NextResponse.json({ error: "MISSING_SCOPE_ID" }, { status: 400 });
  }

  const rawStatus = url.searchParams.get("status");
  const statusFilter =
    rawStatus && STATUS_SET.has(rawStatus as SkillPracticeStatus) ? (rawStatus as SkillPracticeStatus) : null;

  const className = url.searchParams.get("className");
  const unitId = url.searchParams.get("unitId");
  const studentQ = url.searchParams.get("studentQ");
  const skillQ = url.searchParams.get("skillQ");

  try {
    const data = await getAdminSkillPracticeOverview(scopeId, {
      className: className?.trim() || null,
      unitId: unitId?.trim() || null,
      studentQ: studentQ?.trim() || null,
      skillQ: skillQ?.trim() || null,
      statusFilter,
    });
    if (!data) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: "SKILL_PRACTICE_OVERVIEW_FAILED", detail: msg }, { status: 500 });
  }
}
