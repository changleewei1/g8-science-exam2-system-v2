import { redirect, notFound } from "next/navigation";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";
import { getVideoDetailUseCase } from "@/infrastructure/composition";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { ensureExam3VideoQuizReady } from "@/lib/admin/ensure-exam3-video-quiz-ready";
import { getStudentSession } from "@/lib/session";
import { parseStudentVideoSearchParams } from "@/lib/student-video-context";
import { VideoPageClient } from "./VideoPageClient";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ videoId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function VideoPage({ params, searchParams }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");
  const { videoId } = await params;
  const sp = await searchParams;
  const { fromTask, taskId } = parseStudentVideoSearchParams(sp);
  const uc = getVideoDetailUseCase();
  await ensureExam3VideoQuizReady(getSupabaseAdmin(), videoId);
  const data = await uc.execute(videoId, session.studentId);
  if (!data?.video) notFound();

  const v = data.video;
  const progress = data.progress;
  const quiz = data.quiz;

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <StudentLightTechBackground />
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10 md:max-w-6xl">
        <VideoPageClient
          unitId={v.unitId}
          videoId={v.id}
          youtubeVideoId={v.youtubeVideoId}
          title={v.title}
          initialPosition={progress?.lastPositionSeconds ?? 0}
          quizId={quiz?.id ?? null}
          canTakeQuiz={progress?.canTakeQuiz() ?? false}
          fromTask={fromTask}
          taskId={taskId}
        />
      </main>
    </div>
  );
}
