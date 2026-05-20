import { notFound, redirect } from "next/navigation";
import { Info } from "lucide-react";
import { ExamScopeHero } from "@/components/student/exam-scope/ExamScopeHero";
import { ExamScopeProgressSection } from "@/components/student/exam-scope/ExamScopeProgressSection";
import { ExamScopeUnitsPanel } from "@/components/student/exam-scope/ExamScopeUnitsPanel";
import { getExamScopeUseCase, getStudentLearningService } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";
import { getStudentSkillPracticeRows } from "@/lib/skill-practice-summary";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ scopeId: string }> };

export default async function ExamScopePage({ params }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");
  const { scopeId } = await params;
  const uc = getExamScopeUseCase();
  const data = await uc.execute(scopeId);
  if (!data) notFound();

  const learning = getStudentLearningService();
  const [videoCompletion, quizPass, practice] = await Promise.all([
    learning.getVideoCompletionRate(session.studentId, scopeId),
    learning.getQuizPassRate(session.studentId, scopeId),
    getStudentSkillPracticeRows(session.studentId, scopeId),
  ]);

  const skillCountByUnit = new Map((practice?.units ?? []).map((u) => [u.unit_id, u.skills.length]));

  const unitsPayload = data.units.map((u) => ({
    id: u.id,
    unitTitle: u.unitTitle,
    unitCode: u.unitCode,
    skillCount: skillCountByUnit.get(u.id) ?? 0,
    sortOrder: u.sortOrder,
  }));

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <StudentLightTechBackground />

      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10 md:max-w-6xl">
        <ExamScopeHero
          scopeId={scopeId}
          title={data.scope.title}
          description={data.scope.description}
        />

        <ExamScopeProgressSection videoCompletion={videoCompletion} quizPass={quizPass} />

        <ExamScopeUnitsPanel units={unitsPayload} />

        <section
          className="mt-10 flex gap-3 rounded-2xl border border-sky-200/70 bg-sky-50/90 p-4 shadow-[0_4px_24px_-8px_rgba(14,165,233,0.2)] backdrop-blur-sm sm:p-5"
          aria-label="使用說明"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
          <p className="text-sm font-medium leading-relaxed text-slate-800">
            點擊單元卡片可展開說明並進入該單元；若要練習段考技能樹，請使用上方「查看段考技能樹」。
          </p>
        </section>
      </main>
    </div>
  );
}
