import { NextResponse } from "next/server";

/** 班級卡片預算各段考摘要；班級×段考多時可能較慢，後續可改 DB 聚合或快取。 */
import {
  getAdminDashboardService,
  getRepositories,
} from "@/infrastructure/composition";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import type { ExamScopeLike } from "@/lib/admin/learning-scope";
import { filterExamScopesForTeacher } from "@/lib/admin/teacher-exam-scopes";
import { getTeacherScopeFilter } from "@/lib/admin/teacher-tracking-config";
import { getAdminSession } from "@/lib/session";
import type { TeacherClassCardDto } from "@/lib/admin/teacher-tracking-types";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { examScopes: examScopeRepo } = getRepositories();
  const rows = await examScopeRepo.findAllActive();
  const scopes: ExamScopeLike[] = rows.map((s) => ({
    id: s.id,
    title: s.title,
    grade: s.grade,
    term: s.term,
    examNo: s.examNo,
    subject: s.subject,
    isActive: s.isActive,
  }));

  const { grade, subject } = getTeacherScopeFilter();
  const examScopes = filterExamScopesForTeacher(scopes, { grade, subject });

  const supabase = getSupabaseAdmin();
  let q = supabase.from("students").select("class_name").eq("is_active", true);
  if (admin.allowedClasses?.length) {
    q = q.in("class_name", admin.allowedClasses);
  }
  const { data: studentRows, error: stErr } = await q;
  if (stErr) {
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }

  const countByClass = new Map<string, number>();
  for (const r of studentRows ?? []) {
    const cn = (r as { class_name: string | null }).class_name?.trim();
    if (!cn) continue;
    if (admin.allowedClasses?.length && !admin.allowedClasses.includes(cn)) continue;
    countByClass.set(cn, (countByClass.get(cn) ?? 0) + 1);
  }

  const classIds: string[] = admin.allowedClasses?.length
    ? [...admin.allowedClasses]
    : [...countByClass.keys()].sort((a, b) => a.localeCompare(b, "zh-Hant"));

  const svc = getAdminDashboardService();
  const cards: TeacherClassCardDto[] = [];

  for (const classId of classIds) {
    const studentCount = countByClass.get(classId) ?? 0;
    const byExamScope: TeacherClassCardDto["byExamScope"] = {};
    await Promise.all(
      examScopes.map(async (scope) => {
        const overview = await svc.getOverview(scope.id, { classId });
        byExamScope[scope.id] = {
          ...svc.computeSummary(overview),
          studentCount: overview.length,
        };
      }),
    );
    cards.push({ classId, studentCount, byExamScope });
  }

  return NextResponse.json({
    teacherLabel: admin.teacherLabel ?? "國二理化",
    grade,
    subject,
    examScopes,
    classes: cards,
    restricted: Boolean(admin.allowedClasses?.length),
  });
}
