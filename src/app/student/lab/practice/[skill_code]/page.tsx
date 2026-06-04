import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AdaptivePracticeSession } from "@/components/student/AdaptivePracticeSession";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { isAdaptivePracticeLabEnabled } from "@/lib/feature-flags";
import { DEFAULT_SUBJECT_KEY } from "@/lib/subject-defaults";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ skill_code: string }> };

type Search = Record<string, string | string[] | undefined>;

export default async function StudentLabPracticePage({
  params,
  searchParams,
}: PageProps & { searchParams?: Promise<Search> }) {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const enabled = isAdaptivePracticeLabEnabled();
  const sp = (await searchParams) ?? {};
  const scopeIdRaw = sp.scopeId;
  const scopeId = (Array.isArray(scopeIdRaw) ? scopeIdRaw[0] : scopeIdRaw)?.trim() || "";
  const backHref = scopeId
    ? `/student/exam-scope/${encodeURIComponent(scopeId)}/skills`
    : "/student/dashboard";
  const backLabel = scopeId ? "返回段考技能樹" : "回到學習總覽";

  const { skill_code: raw } = await params;
  const skillCode = decodeURIComponent(raw).trim();
  if (!skillCode) notFound();

  if (!enabled) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <StudentBackLink href="/student/dashboard">返回學習總覽</StudentBackLink>
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">智慧練習尚未開放</h1>
          <p className="mt-2 text-sm text-slate-600">
            智慧練習功能目前關閉。請管理者確認環境設定後重新部署。
          </p>
          <Link href={backHref} className="mt-4 inline-block text-sm font-medium text-teal-800 underline">
            {backLabel}
          </Link>
        </div>
      </main>
    );
  }

  let skillName: string | null = null;
  let hasBank = false;
  try {
    const supabase = getSupabaseAdmin();
    const { data: tag } = await supabase.from("skill_tags").select("name").eq("code", skillCode).maybeSingle();
    skillName = tag?.name ?? null;
    const { data: oneQ } = await supabase
      .from("question_bank_items")
      .select("id")
      .eq("skill_code", skillCode)
      .limit(1)
      .maybeSingle();
    hasBank = Boolean(oneQ);
  } catch {
    // 由下方與 API 再擋一次
  }

  if (!skillName && !hasBank) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <StudentBackLink href={backHref}>{backLabel}</StudentBackLink>
        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm">
          <h1 className="text-lg font-semibold">找不到這個能力代碼</h1>
          <p className="mt-2 text-sm">
            代碼「{skillCode}」在能力清單與題庫中都找不到。請改用其他能力代碼。
          </p>
          <Link href={backHref} className="mt-4 inline-block text-sm font-medium text-teal-800 underline">
            {backLabel}
          </Link>
        </div>
      </main>
    );
  }

  const skillLabel = skillName ?? `觀念 ${skillCode}`;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-4 space-y-2">
        <StudentBackLink href={backHref}>{backLabel}</StudentBackLink>
        <h1 className="text-2xl font-semibold text-slate-900">智慧練習</h1>
        <p className="text-sm text-slate-600">透過連續練習提升熟練度，系統會依答題狀況自動調整難度。</p>
        <p className="text-sm text-slate-600">
          能力代碼（skill_code）：<span className="font-mono font-semibold text-slate-900">{skillCode}</span>
        </p>
      </header>

      <AdaptivePracticeSession
        skillCode={skillCode}
        skillLabel={skillLabel}
        examScopeId={scopeId || null}
        subjectKey={DEFAULT_SUBJECT_KEY}
        apiBase="/api/lab/practice"
        backHref={backHref}
      />
    </main>
  );
}
