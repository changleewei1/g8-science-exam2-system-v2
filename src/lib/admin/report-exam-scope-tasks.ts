import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

/** 段考範圍內所有影片 id */
export async function fetchVideoIdsForExamScope(examScopeId: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data: units } = await supabase
    .from("scope_units")
    .select("id")
    .eq("exam_scope_id", examScopeId);
  const unitIds = (units ?? []).map((u: { id: string }) => u.id);
  if (unitIds.length === 0) return [];

  const { data: videos } = await supabase.from("videos").select("id").in("unit_id", unitIds);
  return (videos ?? []).map((v: { id: string }) => v.id);
}

export type TaskListItem = { id: string; title: string; startDate: string };

/** 只保留「至少有一支影片屬於此段考範圍」的學習任務 */
export async function filterTasksByExamScope(
  tasks: TaskListItem[],
  examScopeId: string | null,
): Promise<TaskListItem[]> {
  if (!examScopeId || tasks.length === 0) return tasks;

  const scopeVideoIds = new Set(await fetchVideoIdsForExamScope(examScopeId));
  if (scopeVideoIds.size === 0) return [];

  const supabase = getSupabaseAdmin();
  const taskIds = tasks.map((t) => t.id);
  const { data: tvs } = await supabase
    .from("task_videos")
    .select("task_id, video_id")
    .in("task_id", taskIds);

  const taskHasScopeVideo = new Set<string>();
  for (const row of tvs ?? []) {
    const r = row as { task_id: string; video_id: string };
    if (scopeVideoIds.has(r.video_id)) taskHasScopeVideo.add(r.task_id);
  }

  return tasks.filter((t) => taskHasScopeVideo.has(t.id));
}

export function intersectVideoIds(taskVideoIds: string[], scopeVideoIds: string[]): string[] {
  if (scopeVideoIds.length === 0) return taskVideoIds;
  const scope = new Set(scopeVideoIds);
  return taskVideoIds.filter((id) => scope.has(id));
}
