import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyParentSkillPracticeButton } from "@/components/admin/CopyParentSkillPracticeButton";
import { HomeBackLink } from "@/components/ui/HomeBackLink";
import { getStudentSkillPracticeDetailForAdmin } from "@/lib/skill-practice-summary";
import { getAdminSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ scopeId?: string }>;
};

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function buildParentReportBody(opts: {
  studentName: string;
  className: string | null;
  scopeTitle: string;
  practiced: number;
  mastered: number;
  avgMastery: number;
  weakLines: string[];
}): string {
  const lines = [
    `您好，以下為 ${opts.studentName} 同學（${opts.className ?? "班級未填"}）在「${opts.scopeTitle}」技能樹智慧練習的整理，僅供參考。`,
    ``,
    `‧ 已練習技能數：${opts.practiced}`,
    `‧ 已精熟技能數：${opts.mastered}`,
    `‧ 平均熟練度：${opts.avgMastery} / 100`,
  ];
  if (opts.weakLines.length) {
    lines.push(``, `建議優先加強：`, ...opts.weakLines.map((l) => `‧ ${l}`));
  }
  lines.push(``, `詳細學習報告可由教師後台查看。`);
  return lines.join("\n");
}

export default async function AdminSkillPracticeStudentDetailPage({ params, searchParams }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { studentId } = await params;
  const sp = await searchParams;
  const scopeId = sp.scopeId?.trim();
  if (!scopeId) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 px-4 py-10">
        <p className="mx-auto max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          請從「技能樹練習狀況」主頁選擇段考範圍後，再從學生列進入；或於網址加上{" "}
          <code className="rounded bg-white px-1">?scopeId=...</code>
        </p>
        <p className="mx-auto mt-4 max-w-3xl">
          <Link href="/admin/skill-practice" className="text-teal-800 hover:underline">
            返回技能樹練習追蹤
          </Link>
        </p>
      </div>
    );
  }

  const detail = await getStudentSkillPracticeDetailForAdmin(studentId, scopeId);
  if (!detail) notFound();

  const practicedSkills = detail.skills.filter((s) => s.answered_count > 0);
  const mastered = detail.skills.filter((s) => s.status === "已精熟").length;
  const sumM = practicedSkills.reduce((acc, s) => acc + s.mastery_score, 0);
  const avgMastery = practicedSkills.length ? Math.round(sumM / practicedSkills.length) : 0;
  const weak = detail.skills
    .filter((s) => s.status === "建議加強")
    .sort((a, b) => a.mastery_score - b.mastery_score)
    .slice(0, 5)
    .map((s) => `${s.skill_code} ${s.skill_name}（${s.mastery_score} 分）`);

  const parentText = buildParentReportBody({
    studentName: detail.student.name,
    className: detail.student.class_name,
    scopeTitle: detail.scope.title,
    practiced: practicedSkills.length,
    mastered,
    avgMastery,
    weakLines: weak,
  });

  return (
    <div className="min-h-[100dvh] bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <HomeBackLink />
            <span className="hidden h-6 w-px bg-slate-200 sm:block" aria-hidden />
            <span className="font-semibold text-slate-800 sm:text-lg">單一學生技能練習</span>
          </div>
          <Link
            href={`/admin/skill-practice?scopeId=${encodeURIComponent(scopeId)}`}
            className="text-sm text-teal-800 hover:underline"
          >
            返回全班總覽
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <section>
          <h1 className="text-2xl font-semibold text-slate-900">
            {detail.student.name}
            <span className="ml-2 text-base font-normal text-slate-600">
              {detail.student.class_name ?? ""}
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">段考範圍：{detail.scope.title}</p>
        </section>

        <section className="flex flex-wrap items-center gap-3">
          <Link
            href={`/admin/students/${studentId}/report?examScopeId=${encodeURIComponent(scopeId)}`}
            className="inline-flex min-h-10 items-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
          >
            查看學生學習報告
          </Link>
          <CopyParentSkillPracticeButton text={parentText} />
          <button
            type="button"
            disabled
            className="inline-flex min-h-10 cursor-not-allowed items-center rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm text-slate-400"
            title="此版本預留，尚未與指派流程串接"
          >
            指派補強練習
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">技能明細</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[1000px] w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="py-2 pr-3">skill_code</th>
                  <th className="py-2 pr-3">技能名稱</th>
                  <th className="py-2 pr-3">單元</th>
                  <th className="py-2 pr-3">熟練度</th>
                  <th className="py-2 pr-3">題目數（題庫）</th>
                  <th className="py-2 pr-3">已作答</th>
                  <th className="py-2 pr-3">答對</th>
                  <th className="py-2 pr-3">花費時間</th>
                  <th className="py-2 pr-3">最近練習</th>
                  <th className="py-2">狀態</th>
                </tr>
              </thead>
              <tbody>
                {detail.skills.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      此段考範圍尚無技能清單資料。
                    </td>
                  </tr>
                ) : (
                  detail.skills.map((row) => (
                    <tr key={row.skill_code} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-mono text-xs text-slate-600">{row.skill_code}</td>
                      <td className="py-2 pr-3 font-medium text-slate-900">{row.skill_name}</td>
                      <td className="py-2 pr-3">{row.unit_name}</td>
                      <td className="py-2 pr-3">{row.mastery_score}</td>
                      <td className="py-2 pr-3">{row.bank_question_count}</td>
                      <td className="py-2 pr-3">{row.answered_count}</td>
                      <td className="py-2 pr-3">{row.correct_count}</td>
                      <td className="py-2 pr-3 text-slate-600">{row.time_spent_label}</td>
                      <td className="py-2 pr-3 text-slate-700">{fmtDateTime(row.last_practice_at)}</td>
                      <td className="py-2">{row.status}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
