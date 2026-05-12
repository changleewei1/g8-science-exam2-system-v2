import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { StudentBackLink } from "@/components/student/StudentBackLink";
import { isAdaptivePracticeLabEnabled } from "@/lib/feature-flags";
import { getStudentSession } from "@/lib/session";
import { getStudentSkillPracticeRows, type SkillPracticeStatus } from "@/lib/skill-practice-summary";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ scopeId: string }> };

function statusBadgeClass(status: SkillPracticeStatus): string {
  if (status === "已精熟") return "bg-emerald-100 text-emerald-900";
  if (status === "練習中") return "bg-amber-100 text-amber-900";
  if (status === "建議加強") return "bg-rose-100 text-rose-900";
  return "bg-slate-100 text-slate-700";
}

function rowBg(status: SkillPracticeStatus): string {
  if (status === "已精熟") return "bg-emerald-50/40";
  if (status === "練習中") return "bg-amber-50/40";
  if (status === "建議加強") return "bg-rose-50/40";
  return "bg-slate-50/30";
}

function fmtShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default async function StudentExamScopeSkillsPage({ params }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const { scopeId } = await params;
  const data = await getStudentSkillPracticeRows(session.studentId, scopeId);
  if (!data) notFound();

  const isPracticeEnabled = isAdaptivePracticeLabEnabled();
  const hasUnits = data.units.length > 0;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 space-y-2">
        <StudentBackLink href={`/student/exam-scope/${scopeId}`}>返回段考範圍</StudentBackLink>
        <h1 className="text-2xl font-semibold text-slate-900">技能樹練習狀況</h1>
        <p className="text-sm text-slate-600">
          對照本次段考技能清單，查看智慧練習進度。熟練度來自最近一次練習 session；作答數為累計紀錄。
        </p>
        <p className="text-sm font-medium text-slate-800">段考範圍：{data.scope.title}</p>
      </header>

      {!hasUnits ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="font-medium text-slate-900">目前此段考範圍尚未建立技能清單</p>
          <p className="mt-2 text-sm text-slate-600">請待教師完成單元與題庫對應後再試。</p>
        </section>
      ) : (
        <div className="space-y-4">
          {data.units.map((unit) => (
            <details
              key={unit.unit_id}
              open
              className="group rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="cursor-pointer list-none rounded-2xl px-4 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">{unit.unit_name}</h2>
                  <span className="text-xs text-slate-500 group-open:rotate-0">▼</span>
                </div>
              </summary>
              <div className="border-t border-slate-100 px-2 pb-4 sm:px-4">
                <div className="overflow-x-auto">
                  <table className="min-w-[920px] w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600">
                        <th className="py-3 pl-2 pr-2">技能</th>
                        <th className="py-3 pr-2">類型</th>
                        <th className="py-3 pr-2">題庫題數</th>
                        <th className="py-3 pr-2">已作答</th>
                        <th className="py-3 pr-2">答對</th>
                        <th className="py-3 pr-2">熟練度</th>
                        <th className="py-3 pr-2">花費時間</th>
                        <th className="py-3 pr-2">最近練習</th>
                        <th className="py-3 pr-2">狀態</th>
                        <th className="py-3 pr-2">動作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unit.skills.map((skill) => {
                        const href = `/student/lab/practice/${encodeURIComponent(skill.skill_code)}?scopeId=${encodeURIComponent(scopeId)}`;
                        const pct = Math.min(100, Math.max(0, skill.mastery_score));
                        return (
                          <tr
                            key={skill.skill_code}
                            className={`border-b border-slate-100 ${rowBg(skill.status)}`}
                          >
                            <td className="py-3 pl-2 pr-2 align-top">
                              <p className="font-semibold text-slate-900">
                                <span className="font-mono text-xs text-slate-500">{skill.skill_code}</span>{" "}
                                {isPracticeEnabled ? (
                                  <Link href={href} className="text-teal-900 hover:underline">
                                    {skill.skill_name}
                                  </Link>
                                ) : (
                                  skill.skill_name
                                )}
                              </p>
                              <p className="text-xs text-slate-500">{unit.unit_name}</p>
                            </td>
                            <td className="py-3 pr-2 align-top">{skill.category}</td>
                            <td className="py-3 pr-2 align-top">{skill.bank_question_count}</td>
                            <td className="py-3 pr-2 align-top">{skill.answered_count}</td>
                            <td className="py-3 pr-2 align-top">{skill.correct_count}</td>
                            <td className="py-3 pr-2 align-top">
                              <div className="min-w-[120px]">
                                <div className="flex items-center justify-between gap-2 text-xs text-slate-700">
                                  <span>{skill.mastery_score} / 100</span>
                                </div>
                                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                                  <div
                                    className="h-full rounded-full bg-teal-600 transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-2 align-top text-slate-600">{skill.time_spent_label}</td>
                            <td className="py-3 pr-2 align-top text-slate-600">{fmtShort(skill.last_practice_at)}</td>
                            <td className="py-3 pr-2 align-top">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(skill.status)}`}
                              >
                                {skill.status}
                              </span>
                            </td>
                            <td className="py-3 pr-2 align-top">
                              {skill.bank_question_count <= 0 ? (
                                <span className="text-xs text-amber-800">尚無題庫題目</span>
                              ) : isPracticeEnabled ? (
                                <Link
                                  href={href}
                                  className="inline-flex min-h-9 items-center rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
                                >
                                  {skill.status === "尚未開始" ? "開始練習" : "繼續練習"}
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-500">智慧練習尚未開放</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          ))}
        </div>
      )}
    </main>
  );
}
