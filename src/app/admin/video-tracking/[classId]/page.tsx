import { Suspense } from "react";
import { redirect } from "next/navigation";
import { TeacherClassTrackingClient } from "@/components/admin/TeacherClassTrackingClient";
import { getAdminSession } from "@/lib/session";

type Props = {
  params: Promise<{ classId: string }>;
  searchParams: Promise<{ examScopeId?: string }>;
};

export default async function AdminVideoTrackingClassPage({ params, searchParams }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { classId: raw } = await params;
  const classId = decodeURIComponent(raw);

  if (admin.allowedClasses?.length && !admin.allowedClasses.includes(classId)) {
    redirect("/admin/video-tracking");
  }

  const sp = await searchParams;
  const initialExamScopeId = typeof sp.examScopeId === "string" ? sp.examScopeId : null;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-600">載入班級頁…</div>
      }
    >
      <TeacherClassTrackingClient classId={classId} initialExamScopeId={initialExamScopeId} />
    </Suspense>
  );
}
