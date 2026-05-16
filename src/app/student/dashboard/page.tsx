import Link from "next/link";
import { redirect } from "next/navigation";
import { getStudentDashboardUseCase, getRepositories } from "@/infrastructure/composition";
import type { ActiveSpringExamScopeCardProps } from "@/components/student/ActiveSpringExamScopeCard";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { DashboardHashScroll } from "@/components/student/DashboardHashScroll";
import { StudentG8ExamScopeOverview } from "@/components/student/StudentG8ExamScopeOverview";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { getStudentSession } from "@/lib/session";
import { getDefaultExamScopeId } from "@/lib/constants";
import { getStudentSkillPracticeRows } from "@/lib/skill-practice-summary";
import { resolveSpringSecondExamScope, resolveSpringThirdExamScope } from "@/lib/student-g8-exam-scope-resolver";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const envScope = getDefaultExamScopeId();
  const { examScopes, scopeUnits } = getRepositories();
  const scopes = await examScopes.findAllActive();
  const springSecond = resolveSpringSecondExamScope(scopes, envScope);
  const springThird = resolveSpringThirdExamScope(scopes);

  async function buildScopeCard(scope: { id: string; title: string } | null): Promise<ActiveSpringExamScopeCardProps | null> {
    if (!scope) return null;
    const units = await scopeUnits.findByExamScopeId(scope.id);
    return {
      scopeId: scope.id,
      title: scope.title,
      unitTitles: units.map((u) => u.unitTitle),
    };
  }
  const springSecondCard = await buildScopeCard(springSecond);
  const springThirdCard = await buildScopeCard(springThird);
  const scopeId = springSecond?.id ?? envScope ?? scopes[0]?.id;
  if (!scopeId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-slate-600">尚未設定段考範圍，請聯絡管理員。</p>
      </main>
    );
  }

  const { students } = getRepositories();
  const student = await students.findById(session.studentId);

  const uc = getStudentDashboardUseCase();
  const data = await uc.execute(session.studentId, scopeId);
  const practice = await getStudentSkillPracticeRows(session.studentId, scopeId);

  const flatSkills = practice?.units.flatMap((u) => u.skills) ?? [];
  const practicedSkills = flatSkills.filter((s) => s.answered_count > 0);
  const weakSkills = flatSkills
    .filter((s) => s.status === "建議加強")
    .sort((a, b) => a.mastery_score - b.mastery_score);
  const completedSkills = flatSkills.filter((s) => s.status === "已精熟").length;
  const skillCompletionRate = flatSkills.length > 0 ? Math.round((completedSkills / flatSkills.length) * 100) : 0;
  const avgMastery =
    practicedSkills.length > 0
      ? Math.round(practicedSkills.reduce((acc, s) => acc + s.mastery_score, 0) / practicedSkills.length)
      : 0;
  const latestPracticed = practicedSkills
    .filter((s) => Boolean(s.last_practice_at))
    .sort((a, b) => (b.last_practice_at ?? "").localeCompare(a.last_practice_at ?? ""))[0];

  let todayAnsweredCount = 0;
  if (flatSkills.length > 0) {
    const supabase = getSupabaseAdmin();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todaySessions } = await supabase
      .from("adaptive_practice_sessions")
      .select("id")
      .eq("student_id", session.studentId)
      .in(
        "skill_code",
        flatSkills.map((s) => s.skill_code),
      )
      .gte("created_at", todayStart.toISOString())
      .limit(2000);
    const todaySessionIds = (todaySessions ?? []).map((s) => s.id as string);
    if (todaySessionIds.length > 0) {
      const { count } = await supabase
        .from("adaptive_practice_answers")
        .select("id", { count: "exact", head: true })
        .in("session_id", todaySessionIds);
      todayAnsweredCount = count ?? 0;
    }
  }

  const recommendedSkills = weakSkills.slice(0, 2);
  const recommendationLabel =
    recommendedSkills.length > 0
      ? recommendedSkills.map((s) => s.skill_name).join("、")
      : practicedSkills.length > 0
        ? practicedSkills
            .sort((a, b) => (b.last_practice_at ?? "").localeCompare(a.last_practice_at ?? ""))
            .slice(0, 2)
            .map((s) => s.skill_name)
            .join("、")
        : "開始你的 AI 技能樹練習";
  const statusTag =
    weakSkills.length > 0
      ? "⚠️ 建議加強"
      : todayAnsweredCount > 0
        ? "🔥 本週進步中"
        : "🎯 今日尚未開始 skill 練習";

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-slate-600">找不到段考資料。</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <DashboardHashScroll />
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-slate-500 sm:text-base">你好，{student?.name ?? "同學"}</p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">學習總覽</h1>
          <p className="mt-1 text-sm text-slate-600">
            目前預設進度與建議練習以「{data.scope.title}」為主；亦可從下方選擇其他段考範圍。
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link
            href="/student/tasks"
            className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg border border-teal-600 bg-white px-4 py-2.5 text-sm font-medium text-teal-700 sm:text-base"
          >
            學習任務
          </Link>
          <Link
            href="/student/dashboard#exam-scopes"
            className="interactive-btn inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white sm:text-base"
          >
            進入學習單元
          </Link>
        </div>
      </header>

      <StudentG8ExamScopeOverview springSecond={springSecondCard} springThird={springThirdCard} />

      <Link
        href="/student/dashboard#exam-scopes"
        className="flame-glow group relative mb-7 block overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px] transition-all duration-300 hover:scale-[1.01] hover:shadow-violet-300/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
      >
        <div className="relative rounded-2xl bg-slate-950/90 p-5 text-white sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-300/20 blur-2xl transition group-hover:scale-110" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-violet-100">
                  <span className="animate-flame" aria-hidden>
                    🔥
                  </span>
                  技能樹練習
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">🔥 今日推薦練習</h2>
                <p className="mt-2 max-w-xl text-sm text-violet-100/90">
                  請先選擇本次段考（第二次／第三次），再進入對應技能樹；系統會依答題狀況推薦題目與難度。
                </p>
                <p className="mt-2 text-xs text-violet-200/90">
                  下方「國二理化段考範圍」可選擇「進入技能樹練習」；目前預設進度統計以「{data.scope.title}」為主。
                </p>
              </div>
              <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-right">
                <p className="text-xs text-violet-100/80">熟練度提升</p>
                <p className="text-2xl font-bold text-emerald-300">+{Math.max(0, avgMastery - 50)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <p className="rounded-lg bg-white/10 px-3 py-2">今日推薦：{recommendationLabel}</p>
              <p className="rounded-lg bg-white/10 px-3 py-2">{statusTag}</p>
              <p className="rounded-lg bg-white/10 px-3 py-2">今日練習題數：{todayAnsweredCount}</p>
              <p className="rounded-lg bg-white/10 px-3 py-2">
                最近提升技能：{latestPracticed ? latestPracticed.skill_name : "開始你的 AI 技能樹練習"}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-violet-100">
                  <span>熟練度進度</span>
                  <span>{avgMastery} / 100</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-emerald-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, avgMastery))}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-violet-100">
                  <span>skill 完成率</span>
                  <span>{skillCompletionRate}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-300 to-pink-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, skillCompletionRate))}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-white px-4 py-2 text-base font-semibold text-violet-700 transition group-hover:scale-[1.02]">
              ⚡ 選擇段考並開始練習
            </div>
          </div>
        </div>
      </Link>

      <section className="mb-8 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-medium text-slate-700">整體進度</h2>
        <ProgressBar value={data.videoCompletion} label="影片完成率（範圍內）" />
        <ProgressBar value={data.quizPass} label="測驗通過率（已提交次數）" />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-slate-700">單元列表</h2>
        <ul className="space-y-3">
          {data.units.map((u) => (
            <li key={u.id}>
              <Link
                href={`/student/unit/${u.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300"
              >
                <span className="font-medium text-slate-900">{u.unitTitle}</span>
                <span className="ml-2 text-xs text-slate-500">{u.unitCode}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
