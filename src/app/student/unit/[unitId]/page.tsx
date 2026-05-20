import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { Info } from "lucide-react";
import { UnitPageHero } from "@/components/student/unit/UnitPageHero";
import { UnitVideosEmpty, UnitVideosPanel } from "@/components/student/unit/UnitVideosPanel";
import { getListUnitVideosUseCase, getRepositories } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ unitId: string }> };

export default async function UnitPage({ params }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");
  const { unitId } = await params;
  const { scopeUnits, examScopes } = getRepositories();
  const unit = await scopeUnits.findById(unitId);
  if (!unit) notFound();

  const scope = await examScopes.findById(unit.examScopeId);
  const scopeTitle = scope?.title ?? "段考範圍";

  const uc = getListUnitVideosUseCase();
  const rows = await uc.execute(unitId, session.studentId);
  const hasVideos = rows.length > 0;

  const videoPayload = rows.map((r) => ({
    videoId: r.video.id,
    title: r.video.title,
    completionRate: r.completionRate,
    isCompleted: r.isCompleted,
    canTakeQuiz: r.canTakeQuiz,
    quizId: r.quizId,
    quizPassed: r.quizPassed,
  }));

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <StudentLightTechBackground />

      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10 md:max-w-6xl">
        <UnitPageHero
          unitTitle={unit.unitTitle}
          unitCode={unit.unitCode}
          examScopeId={unit.examScopeId}
          scopeTitle={scopeTitle}
        />

        {hasVideos ? (
          <UnitVideosPanel unitId={unitId} videos={videoPayload} />
        ) : (
          <UnitVideosEmpty examScopeId={unit.examScopeId} />
        )}

        <section
          className="mt-10 flex gap-3 rounded-2xl border border-sky-200/70 bg-sky-50/90 p-4 shadow-[0_4px_24px_-8px_rgba(14,165,233,0.2)] backdrop-blur-sm sm:p-5"
          aria-label="使用說明"
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" aria-hidden />
          <p className="text-sm font-medium leading-relaxed text-slate-800">
            建議依由上而下的順序觀看影片；完成觀看後再進行 AI 學習診斷。若要練習整段考技能樹，請使用上方「查看段考技能樹」。
          </p>
        </section>
      </main>
    </div>
  );
}
