import { NextResponse } from "next/server";

import {
  loadTeacherReportPreferences,
  TEACHER_EMAIL_SECTION_KEYS,
  TEACHER_SECTION_LABELS,
  intersectSectionsWithReportMode,
} from "@/lib/admin/teacher-report-preferences";
import { buildTeacherDailyEmailReport } from "@/lib/report/buildTeacherDailyEmailReport";
import { renderTeacherDailyEmailHtml } from "@/lib/report/renderTeacherDailyEmailHtml";
import { wrapEmailBody } from "@/lib/report/sendDailyReportEmail";
import { getAdminSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

  try {
    const prefs = await loadTeacherReportPreferences();
    const report = await buildTeacherDailyEmailReport(undefined, prefs);
    const vis = intersectSectionsWithReportMode(prefs.reportMode, prefs.teacherSections);
    const sectionsOn = TEACHER_EMAIL_SECTION_KEYS.filter((k) => vis[k] !== false).map((k) => ({
      key: k,
      label: TEACHER_SECTION_LABELS[k],
    }));
    const html = wrapEmailBody(renderTeacherDailyEmailHtml(report));
    return NextResponse.json({
      ok: true,
      subject: report.mailTitle,
      examScopeTitle: report.examScopeTitle,
      reportModeLabel: report.reportModeLabel,
      studentCount: report.activeStudentCount,
      scopeUnitTitles: report.scopeUnitTitles,
      sectionsOn,
      html,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: "PREVIEW_FAILED", message }, { status: 500 });
  }
}
