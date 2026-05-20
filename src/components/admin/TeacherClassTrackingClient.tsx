"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ClassLearningDashboard } from "@/components/admin/ClassLearningDashboard";
import { ExamScopeTabs } from "@/components/admin/ExamScopeTabs";
import { TeacherClassSidebar } from "@/components/admin/TeacherClassSidebar";
import { useTeacherClasses } from "@/hooks/admin/useTeacherClasses";

type Props = {
  classId: string;
  initialExamScopeId?: string | null;
};

export function TeacherClassTrackingClient({ classId, initialExamScopeId }: Props) {
  const { meta, loading } = useTeacherClasses();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scopes = meta?.examScopes ?? [];
  const navItems = useMemo(
    () => meta?.classes.map((c) => ({ classId: c.classId, studentCount: c.studentCount })) ?? [],
    [meta],
  );

  const examFromUrl = searchParams.get("examScopeId") ?? initialExamScopeId ?? null;
  const [activeExamId, setActiveExamId] = useState<string | null>(null);

  useEffect(() => {
    if (scopes.length === 0) {
      setActiveExamId(null);
      return;
    }
    if (examFromUrl && scopes.some((s) => s.id === examFromUrl)) {
      setActiveExamId(examFromUrl);
      return;
    }
    setActiveExamId(scopes[0]!.id);
  }, [examFromUrl, scopes]);

  function onExamChange(id: string) {
    setActiveExamId(id);
    const p = new URLSearchParams(searchParams.toString());
    p.set("examScopeId", id);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  }

  const scopeTitle = scopes.find((s) => s.id === activeExamId)?.title ?? null;

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="hidden lg:block">
        <TeacherClassSidebar items={navItems} currentClassId={classId} />
      </div>
      <div className="lg:hidden">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">班級</p>
        <TeacherClassSidebar horizontal items={navItems} currentClassId={classId} />
      </div>

      <div className="min-w-0 flex-1 space-y-6">
        <ExamScopeTabs
          scopes={scopes}
          value={activeExamId}
          onChange={onExamChange}
          disabled={loading || scopes.length === 0}
        />
        <ClassLearningDashboard classId={classId} examScopeId={activeExamId} scopeTitle={scopeTitle} />
      </div>
    </div>
  );
}
