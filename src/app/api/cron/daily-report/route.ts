import { NextResponse } from "next/server";

import {
  loadTeacherReportPreferences,
  mergeDailyReportPayloadOptionsFromPreferences,
  type ParentSendMode,
} from "@/lib/admin/teacher-report-preferences";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getEnv } from "@/lib/env";
import type { StudentScopeCompletionRow } from "@/lib/report/buildDailyOverviewPayload";
import { buildDailyOverviewPayload } from "@/lib/report/buildDailyOverviewPayload";
import { buildParentDailyEmailReport } from "@/lib/report/buildParentDailyEmailReport";
import { buildTeacherDailyEmailReport } from "@/lib/report/buildTeacherDailyEmailReport";
import {
  sendParentDailyReportEmail,
  sendTeacherDailyReportEmail,
} from "@/lib/report/sendDailyReportEmail";

export const runtime = "nodejs";

function requireEnvList(names: string[]): { ok: true } | { ok: false; missing: string[] } {
  const missing = names.filter((name) => !getEnv(name));
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}

function isAuthorized(req: Request): boolean {
  const cronSecret = getEnv("CRON_SECRET");
  if (!cronSecret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

function parseBoolParam(url: URL, key: string, defaultValue: boolean): boolean {
  const raw = url.searchParams.get(key);
  if (raw === null) return defaultValue;
  const v = raw.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return defaultValue;
}

function isScopeIncomplete(mine: StudentScopeCompletionRow | undefined): boolean {
  if (!mine) return true;
  return !(mine.videoCompletionRate >= 100 && mine.quizCompletionRate >= 100);
}

function shouldSendParentInCron(
  mode: ParentSendMode,
  mine: StudentScopeCompletionRow | undefined,
): boolean {
  if (mode === "manual") return false;
  if (mode === "all") return true;
  const completion = mine?.overallCompletion ?? 0;
  if (mode === "risk_only") return completion < 30;
  if (mode === "incomplete_only") return isScopeIncomplete(mine);
  return false;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      {
        ok: false,
        error: "UNAUTHORIZED",
        message: "授權失敗，請確認 Authorization: Bearer <CRON_SECRET>。",
      },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const sendTeacherReport = parseBoolParam(url, "sendTeacherReport", true);
  const sendParentReports = parseBoolParam(url, "sendParentReports", false);
  const examScopeOverride =
    url.searchParams.get("examScopeId")?.trim() || url.searchParams.get("scopeId")?.trim() || null;

  const prefs = await loadTeacherReportPreferences();
  const payloadOptions = mergeDailyReportPayloadOptionsFromPreferences(prefs, examScopeOverride);

  if (!sendTeacherReport && !sendParentReports) {
    return NextResponse.json(
      {
        ok: false,
        error: "NOOP",
        message: "sendTeacherReport 與 sendParentReports 不可同時為 false。",
      },
      { status: 400 },
    );
  }

  const willSendTeacher = sendTeacherReport && prefs.emailEnabled;
  const willSendParent =
    sendParentReports && prefs.parentSummaryEnabled && prefs.parentSendMode !== "manual";

  if (!willSendTeacher && !willSendParent) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "PREFERENCES_OR_FLAGS",
      message:
        "依後台設定或查詢參數，本次不寄送老師信與家長信（例如 email_enabled=false、家長摘要未啟用、或 parent_send_mode=manual）。",
      sendTeacherReport,
      sendParentReports,
      preferences: {
        emailEnabled: prefs.emailEnabled,
        parentSummaryEnabled: prefs.parentSummaryEnabled,
        parentSendMode: prefs.parentSendMode,
      },
    });
  }

  const transactionalEnv = requireEnvList(["RESEND_API_KEY", "EMAIL_FROM"]);
  if (!transactionalEnv.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "MISSING_ENV",
        message: `系統設定未完成，缺少環境變數：${transactionalEnv.missing.join(", ")}`,
      },
      { status: 500 },
    );
  }

  if (willSendTeacher) {
    const adminEnv = requireEnvList(["ADMIN_NOTIFY_EMAIL"]);
    if (!adminEnv.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "MISSING_ENV",
          message: `寄送老師版需要：${adminEnv.missing.join(", ")}`,
        },
        { status: 500 },
      );
    }
  }

  const cronSecret = getEnv("CRON_SECRET");
  if (!cronSecret) {
    return NextResponse.json(
      { ok: false, error: "MISSING_ENV", message: "缺少環境變數：CRON_SECRET" },
      { status: 500 },
    );
  }

  const resendApiKey = getEnv("RESEND_API_KEY") as string;
  const emailFrom = getEnv("EMAIL_FROM") as string;
  const adminEmail = getEnv("ADMIN_NOTIFY_EMAIL");

  const parentStats = {
    success: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  let teacherEmailId: string | null = null;
  let teacherSubject: string | null = null;
  let teacherReportSnapshot: Awaited<ReturnType<typeof buildTeacherDailyEmailReport>> | null = null;

  try {
    if (willSendTeacher) {
      const teacherReport = await buildTeacherDailyEmailReport(payloadOptions, prefs);
      teacherReportSnapshot = teacherReport;
      const baseSubject = teacherReport.mailTitle;
      teacherSubject =
        teacherReport.taskCount > 0 ? `${baseSubject}（含任務追蹤 ${teacherReport.taskCount} 筆）` : baseSubject;
      const sent = await sendTeacherDailyReportEmail({
        resendApiKey,
        from: emailFrom,
        to: adminEmail!,
        subject: teacherSubject,
        report: teacherReport,
      });
      teacherEmailId = sent.id ?? null;
    }

    let sharedPayload: Awaited<ReturnType<typeof buildDailyOverviewPayload>> | null = null;
    if (willSendParent) {
      const supabase = getSupabaseAdmin();
      sharedPayload = await buildDailyOverviewPayload(payloadOptions);

      const { data: rows } = await supabase
        .from("students")
        .select("id, parent_email, is_active")
        .eq("is_active", true);

      for (const r of rows ?? []) {
        const row = r as { id: string; parent_email: string | null };
        const pe = (row.parent_email ?? "").trim();
        if (!pe) {
          parentStats.skipped += 1;
          continue;
        }

        const mine = sharedPayload.studentCompletions.find((s) => s.studentId === row.id);
        if (!shouldSendParentInCron(prefs.parentSendMode, mine)) {
          parentStats.skipped += 1;
          continue;
        }

        const built = await buildParentDailyEmailReport(row.id, sharedPayload, {
          parentSectionsResolved: prefs.parentSections,
        });
        if (!built.ok) {
          parentStats.skipped += 1;
          continue;
        }

        try {
          await sendParentDailyReportEmail({
            resendApiKey,
            from: emailFrom,
            to: built.data.toEmail,
            subject: built.data.subject,
            report: built.data,
          });
          parentStats.success += 1;
        } catch (e) {
          parentStats.failed += 1;
          const msg = e instanceof Error ? e.message : String(e);
          parentStats.errors.push(`${row.id}: ${msg}`);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      sendTeacherReport,
      sendParentReports,
      appliedPreferences: {
        emailEnabled: prefs.emailEnabled,
        teacherReportSent: willSendTeacher,
        parentSummaryEnabled: prefs.parentSummaryEnabled,
        parentSendMode: prefs.parentSendMode,
        parentBatchSent: willSendParent,
        reportMode: prefs.reportMode,
        selectedScopeId: prefs.selectedScopeId,
        selectedUnitIds: prefs.selectedUnitIds,
      },
      examScopeId: sharedPayload?.examScopeId ?? teacherReportSnapshot?.examScopeId ?? null,
      examScopeTitle: sharedPayload?.examScopeTitle ?? teacherReportSnapshot?.examScopeTitle ?? null,
      teacher: willSendTeacher
        ? {
            emailId: teacherEmailId,
            subject: teacherSubject,
            examScopeId: teacherReportSnapshot?.examScopeId,
            examScopeTitle: teacherReportSnapshot?.examScopeTitle,
          }
        : { skipped: true, reason: sendTeacherReport ? "email_disabled_in_preferences" : "query_disabled" },
      parentEmails: willSendParent ? parentStats : { skipped: true, reason: "preferences_or_query" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知錯誤";
    return NextResponse.json(
      {
        ok: false,
        error: "DAILY_REPORT_FAILED",
        message,
      },
      { status: 500 },
    );
  }
}
