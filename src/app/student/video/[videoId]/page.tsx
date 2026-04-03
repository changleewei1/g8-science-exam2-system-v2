import { redirect, notFound } from "next/navigation";
import { getVideoDetailUseCase } from "@/infrastructure/composition";
import { getStudentSession } from "@/lib/session";
import { VideoPageClient } from "./VideoPageClient";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ videoId: string }> };

export default async function VideoPage({ params }: Props) {
  const session = await getStudentSession();
  if (!session) redirect("/login");
  const { videoId } = await params;
  const uc = getVideoDetailUseCase();
  const data = await uc.execute(videoId, session.studentId);
  if (!data?.video) notFound();

  const v = data.video;
  const progress = data.progress;
  const quiz = data.quiz;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <VideoPageClient
        unitId={v.unitId}
        videoId={v.id}
        youtubeVideoId={v.youtubeVideoId}
        title={v.title}
        initialPosition={progress?.lastPositionSeconds ?? 0}
        quizId={quiz?.id ?? null}
        canTakeQuiz={progress?.canTakeQuiz() ?? false}
      />
    </main>
  );
}
