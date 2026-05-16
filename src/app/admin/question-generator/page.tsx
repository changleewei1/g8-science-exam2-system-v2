import { redirect } from "next/navigation";
import Link from "next/link";
import { AiQuestionLabClient } from "@/components/admin/AiQuestionLabClient";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QuestionGeneratorPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <header className="border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin" className="text-sm text-teal-700 underline">
              返回後台
            </Link>
            <span className="hidden h-5 w-px bg-slate-200 sm:block" aria-hidden />
            <span className="font-semibold text-slate-800">影片理解題產生</span>
          </div>
          <Link href="/admin/question-candidates" className="text-sm font-medium text-teal-800 underline">
            題目候選審核
          </Link>
        </div>
      </header>
      <AiQuestionLabClient />
    </div>
  );
}
