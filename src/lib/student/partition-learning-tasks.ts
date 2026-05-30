import type { StudentTaskView } from "@/domain/services/learning-task-service";

export function taskInEffectiveWindow(startDate: string, endDate: string, today: string): boolean {
  return today >= startDate && today <= endDate;
}

export function partitionStudentLearningTasks(
  tasks: StudentTaskView[],
  today: string,
): {
  newTasks: StudentTaskView[];
  inProgressTasks: StudentTaskView[];
  completedTasks: StudentTaskView[];
} {
  const newTasks: StudentTaskView[] = [];
  const inProgressTasks: StudentTaskView[] = [];
  const completedTasks: StudentTaskView[] = [];

  const cmp = (a: StudentTaskView, b: StudentTaskView) => (a.startDate < b.startDate ? 1 : -1);

  for (const t of tasks) {
    if (t.completionRate >= 100) {
      completedTasks.push(t);
      continue;
    }
    const inWin = taskInEffectiveWindow(t.startDate, t.endDate, today);
    if (inWin && !t.taskOpenedAt) {
      newTasks.push(t);
    } else {
      inProgressTasks.push(t);
    }
  }

  newTasks.sort(cmp);
  inProgressTasks.sort(cmp);
  completedTasks.sort(cmp);
  return { newTasks, inProgressTasks, completedTasks };
}

export function studentTasksTodayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
