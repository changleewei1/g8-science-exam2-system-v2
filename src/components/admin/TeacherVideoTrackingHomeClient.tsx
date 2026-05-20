"use client";

import { TeacherClassSidebar } from "@/components/admin/TeacherClassSidebar";
import { ClassOverviewCards } from "@/components/admin/ClassOverviewCards";
import { useTeacherClasses } from "@/hooks/admin/useTeacherClasses";

export function TeacherVideoTrackingHomeClient() {
  const { meta, loading, error, refetch } = useTeacherClasses();

  const navItems =
    meta?.classes.map((c) => ({ classId: c.classId, studentCount: c.studentCount })) ?? [];

  return (
    <div className="space-y-8">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
          <p className="font-medium">{error}</p>
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-cyan-800 underline"
            onClick={() => void refetch()}
          >
            重新載入
          </button>
        </div>
      ) : null}

      {meta && navItems.length > 0 ? (
        <div className="lg:hidden">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">班級</p>
          <TeacherClassSidebar horizontal items={navItems} currentClassId={null} />
        </div>
      ) : null}

      {meta ? (
        <ClassOverviewCards
          teacherLabel={meta.teacherLabel}
          examScopes={meta.examScopes}
          classes={meta.classes}
          loading={loading}
        />
      ) : loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-64 rounded-xl bg-slate-200/80" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="h-52 rounded-2xl bg-slate-200/60" />
            <div className="h-52 rounded-2xl bg-slate-200/60" />
            <div className="h-52 rounded-2xl bg-slate-200/60" />
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-600">尚無班級資料。</p>
      )}
    </div>
  );
}
