import { redirect } from "next/navigation";
import Link from "next/link";
import { QuestionCandidatesAdminClient } from "@/components/admin/QuestionCandidatesAdminClient";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QuestionCandidatesPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link href="/admin" className="text-sm text-teal-700 underline">
            返回後台
          </Link>
          <span className="font-semibold text-slate-800">題目候選審核</span>
        </div>
      </header>
      <QuestionCandidatesAdminClient />
    </div>
  );
}
