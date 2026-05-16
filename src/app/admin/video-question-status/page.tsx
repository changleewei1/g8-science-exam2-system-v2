import Link from "next/link";
import { redirect } from "next/navigation";
import { Exam3VideoQuestionStatusClient } from "@/components/admin/Exam3VideoQuestionStatusClient";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Exam3VideoQuestionStatusPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/admin" className="text-sm text-teal-700 underline">
            返回後台
          </Link>
          <span className="font-semibold text-slate-800">影片題目狀態</span>
        </div>
      </header>
      <Exam3VideoQuestionStatusClient />
    </div>
  );
}
