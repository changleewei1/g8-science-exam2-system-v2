/**
 * 學生從「學習任務」或「學習單元」進入影片／測驗時，以 query 延續情境。
 */
export type StudentVideoQuery = {
  from?: string;
  taskId?: string;
};

export function parseStudentVideoSearchParams(
  raw: Record<string, string | string[] | undefined>,
): { fromTask: boolean; taskId: string | null } {
  const from = typeof raw.from === "string" ? raw.from.toLowerCase() : "";
  const taskIdRaw = raw.taskId;
  const taskId =
    typeof taskIdRaw === "string" && taskIdRaw.length > 0 ? taskIdRaw : null;
  return {
    fromTask: from === "task",
    taskId,
  };
}

export function buildVideoPageQuery(opts: {
  fromTask: boolean;
  taskId: string | null;
}): string {
  if (!opts.fromTask) return "";
  const q = new URLSearchParams({ from: "task" });
  if (opts.taskId) q.set("taskId", opts.taskId);
  return `?${q.toString()}`;
}

export function buildQuizPageQuery(opts: {
  fromTask: boolean;
  taskId: string | null;
  unitId: string;
}): string {
  const parts = new URLSearchParams();
  if (opts.fromTask) {
    parts.set("from", "task");
    if (opts.taskId) parts.set("taskId", opts.taskId);
  }
  parts.set("unitId", opts.unitId);
  return `?${parts.toString()}`;
}
