import { TaskCreateForm } from "@/app/admin/tasks/TaskCreateForm";
import { getRepositories } from "@/infrastructure/composition";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ taskId: string }> };

export default async function AdminTaskEditPage({ params }: Props) {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  const { taskId } = await params;
  const { videos: videoRepo, learningTasks } = getRepositories();
  const task = await learningTasks.findById(taskId);
  if (!task) notFound();

  const videoEntities = await videoRepo.findAllForAdmin();
  const unitIds = [...new Set(videoEntities.map((v) => v.unitId))];
  const unitTitleById = new Map<string, string>();
  if (unitIds.length > 0) {
    const supabase = getSupabaseAdmin();
    const { data: units } = await supabase
      .from("scope_units")
      .select("id, unit_title")
      .in("id", unitIds);
    for (const u of units ?? []) {
      const row = u as { id: string; unit_title: string };
      unitTitleById.set(row.id, row.unit_title);
    }
  }
  const videos = videoEntities.map((v) => {
    const ut = unitTitleById.get(v.unitId) ?? "單元";
    const suffix = v.isActive ? "" : "（已停用）";
    return { id: v.id, label: `${ut} · ${v.title}${suffix}` };
  });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/tasks/${taskId}`}
          className="interactive-nav text-sm font-medium text-teal-700 underline-offset-4 hover:underline"
        >
          ← 返回任務詳情
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">編輯學習任務</h1>
        <p className="mt-2 text-sm text-slate-600">{task.title}</p>
      </div>
      <TaskCreateForm videos={videos} editTaskId={taskId} />
    </div>
  );
}
