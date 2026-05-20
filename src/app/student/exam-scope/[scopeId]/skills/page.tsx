import { notFound, redirect } from "next/navigation";
import { SkillsPracticeHero } from "@/components/student/skills/SkillsPracticeHero";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";
import { SkillsPracticeUnitsPanel } from "@/components/student/skills/SkillsPracticeUnitsPanel";
import { isAdaptivePracticeLabEnabled } from "@/lib/feature-flags";
import { getStudentSession } from "@/lib/session";
import { getStudentSkillPracticeRows } from "@/lib/skill-practice-summary";
import { Info } from "lucide-react";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ scopeId: string }> };

export default async function StudentExamScopeSkillsPage({ params }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const { scopeId } = await params;
  const data = await getStudentSkillPracticeRows(session.studentId, scopeId);
  if (!data) notFound();

  const isPracticeEnabled = isAdaptivePracticeLabEnabled();

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <StudentLightTechBackground />

      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10 md:max-w-6xl">
        <SkillsPracticeHero scopeId={scopeId} scopeTitle={data.scope.title} />

        <SkillsPracticeUnitsPanel scopeId={scopeId} units={data.units} isPracticeEnabled={isPracticeEnabled} />

        <section
          className="mt-10 flex gap-3 rounded-2xl border border-sky-200/70 bg-sky-50/90 p-4 shadow-[0_4px_24px_-8px_rgba(14,165,233,0.2)] backdrop-blur-sm sm:p-5"
          aria-label="使用說明"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
          <p className="text-sm font-medium leading-relaxed text-slate-800">
            點擊上方單元以展開技能清單，查看你的練習進度與熟練度分析。
          </p>
        </section>
      </main>
    </div>
  );
}
