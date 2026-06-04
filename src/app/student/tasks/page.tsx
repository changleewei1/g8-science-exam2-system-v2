import { TaskListScrollAnchor } from "@/components/student/TaskListScrollAnchor";
import { LearningTasksPageView } from "@/components/student/tasks/LearningTasksPageView";
import { StudentLightTechBackground } from "@/components/student/StudentLightTechBackground";
import { getStudentLearningTasksUseCase } from "@/infrastructure/composition";
import { fetchStudentQuestionUpdateNotifications } from "@/lib/student-question-update-notifications";
import { partitionStudentLearningTasks, studentTasksTodayYmd } from "@/lib/student/partition-learning-tasks";
import { getStudentSession } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{ taskId?: string }>;
};

export default async function StudentTasksPage({ searchParams }: PageProps) {
  const session = await getStudentSession();
  if (!session) redirect("/login");

  const { taskId: focusTaskId } = await searchParams;

  const uc = getStudentLearningTasksUseCase();
  const [tasks, questionUpdates] = await Promise.all([
    uc.execute(session.studentId),
    fetchStudentQuestionUpdateNotifications(session.studentId, { onlyUnread: false, limit: 40 }),
  ]);
  const today = studentTasksTodayYmd();
  const { newTasks, inProgressTasks, completedTasks } = partitionStudentLearningTasks(tasks, today);

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)]">
      <StudentLightTechBackground />
      <TaskListScrollAnchor taskId={focusTaskId} />
      <main className="relative mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-10 md:max-w-6xl">
        <LearningTasksPageView
          newTasks={newTasks}
          inProgressTasks={inProgressTasks}
          completedTasks={completedTasks}
          questionUpdates={questionUpdates}
        />
      </main>
    </div>
  );
}
