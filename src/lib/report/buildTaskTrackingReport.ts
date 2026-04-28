import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type TaskTrackingReport = {
  tasks: {
    taskId: string;
    title: string;
    className: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    totalVideos: number;
    totalQuizzes: number;
    students: {
      studentId: string;
      name: string;
      completedVideos: number;
      videoCompletionRate: number | null;
      completedQuizzes: number;
      quizCompletionRate: number | null;
      todayNewVideoCompletions: number;
      todayNewQuizAttempts: number;
    }[];
    incompleteStudents: { studentId: string; name: string }[];
  }[];
  html: string;
  warnings: string[];
};

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function ymdTaipei(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei" }).format(d);
}

export async function buildTaskTrackingReport(): Promise<TaskTrackingReport> {
  const supabase = getSupabaseAdmin();
  const warnings: string[] = [];
  const today = ymdTaipei();

  const { data: tasks } = await supabase
    .from("learning_tasks")
    .select("id, title, class_name, start_date, end_date, is_active")
    .eq("is_active", true)
    .lte("start_date", today)
    .gte("end_date", today)
    .order("start_date", { ascending: false });

  const activeTasks = (tasks ?? []) as {
    id: string;
    title: string;
    class_name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
  }[];

  if (activeTasks.length === 0) {
    return { tasks: [], html: "", warnings };
  }

  const { data: students } = await supabase
    .from("students")
    .select("id, name, class_name, is_active")
    .eq("is_active", true);
  const activeStudents = (students ?? []) as { id: string; name: string; class_name: string | null }[];
  const studentsByClass = new Map<string, { id: string; name: string }[]>();
  for (const s of activeStudents) {
    if (!s.class_name) continue;
    const list = studentsByClass.get(s.class_name) ?? [];
    list.push({ id: s.id, name: s.name });
    studentsByClass.set(s.class_name, list);
  }

  const startTs = `${today}T00:00:00+08:00`;
  const endTs = `${today}T23:59:59+08:00`;

  const taskBlocks: TaskTrackingReport["tasks"] = [];

  for (const t of activeTasks) {
    const { data: tvs } = await supabase
      .from("task_videos")
      .select("video_id")
      .eq("task_id", t.id);
    const videoIds = [...new Set((tvs ?? []).map((x: { video_id: string }) => x.video_id))];
    const totalVideos = videoIds.length;

    if (totalVideos === 0) {
      warnings.push(`任務「${t.title}」尚未配置影片，已略過進度統計。`);
      continue;
    }

    const { data: assignees } = await supabase
      .from("learning_task_assignees")
      .select("student_id")
      .eq("task_id", t.id);
    const assigneeIds = (assignees ?? []).map((x: { student_id: string }) => x.student_id);
    const taskStudents =
      assigneeIds.length > 0
        ? activeStudents
            .filter((s) => assigneeIds.includes(s.id))
            .map((s) => ({ id: s.id, name: s.name }))
        : (studentsByClass.get(t.class_name) ?? []);

    const studentIds = taskStudents.map((s) => s.id);
    if (studentIds.length === 0) {
      warnings.push(`任務「${t.title}」找不到可統計學生名單。`);
      continue;
    }

    const { data: stp } = await supabase
      .from("student_task_progress")
      .select("student_id, video_id, is_completed, completed_at")
      .eq("task_id", t.id)
      .in("student_id", studentIds);

    const completedVideoSet = new Set<string>();
    const todayNewVideoByStudent = new Map<string, number>();
    for (const row of stp ?? []) {
      const r = row as {
        student_id: string;
        video_id: string;
        is_completed: boolean;
        completed_at: string | null;
      };
      if (r.is_completed) {
        completedVideoSet.add(`${r.student_id}:${r.video_id}`);
        if (r.completed_at && r.completed_at >= startTs && r.completed_at <= endTs) {
          todayNewVideoByStudent.set(r.student_id, (todayNewVideoByStudent.get(r.student_id) ?? 0) + 1);
        }
      }
    }

    // 任務內 quizzes（以影片對應 quizzes）
    const { data: quizzes } = await supabase.from("quizzes").select("id").in("video_id", videoIds);
    const quizIds = [...new Set((quizzes ?? []).map((q: { id: string }) => q.id))];
    const totalQuizzes = quizIds.length;

    const completedQuizSet = new Set<string>();
    const todayNewQuizByStudent = new Map<string, number>();
    if (quizIds.length > 0) {
      const { data: attempts } = await supabase
        .from("student_quiz_attempts")
        .select("student_id, quiz_id, submitted_at")
        .in("student_id", studentIds)
        .in("quiz_id", quizIds)
        .not("submitted_at", "is", null);
      for (const row of attempts ?? []) {
        const r = row as { student_id: string; quiz_id: string; submitted_at: string | null };
        completedQuizSet.add(`${r.student_id}:${r.quiz_id}`);
        if (r.submitted_at && r.submitted_at >= startTs && r.submitted_at <= endTs) {
          todayNewQuizByStudent.set(r.student_id, (todayNewQuizByStudent.get(r.student_id) ?? 0) + 1);
        }
      }
    }

    const studentsStat = taskStudents.map((s) => {
      let completedVideos = 0;
      for (const vid of videoIds) {
        if (completedVideoSet.has(`${s.id}:${vid}`)) completedVideos += 1;
      }
      const videoCompletionRate = totalVideos > 0 ? toPercent(completedVideos, totalVideos) : null;

      let completedQuizzes = 0;
      for (const qid of quizIds) {
        if (completedQuizSet.has(`${s.id}:${qid}`)) completedQuizzes += 1;
      }
      const quizCompletionRate = totalQuizzes > 0 ? toPercent(completedQuizzes, totalQuizzes) : null;

      return {
        studentId: s.id,
        name: s.name,
        completedVideos,
        videoCompletionRate,
        completedQuizzes,
        quizCompletionRate,
        todayNewVideoCompletions: todayNewVideoByStudent.get(s.id) ?? 0,
        todayNewQuizAttempts: todayNewQuizByStudent.get(s.id) ?? 0,
      };
    });

    const incompleteStudents = studentsStat
      .filter((s) => (s.videoCompletionRate ?? 0) < 100 || (s.quizCompletionRate ?? 0) < 100)
      .map((s) => ({ studentId: s.studentId, name: s.name }));

    taskBlocks.push({
      taskId: t.id,
      title: t.title,
      className: t.class_name,
      startDate: t.start_date,
      endDate: t.end_date,
      isActive: t.is_active !== false,
      totalVideos,
      totalQuizzes,
      students: studentsStat,
      incompleteStudents,
    });
  }

  if (taskBlocks.length === 0) return { tasks: [], html: "", warnings };

  const html = `
    <h2 style="margin:24px 0 8px 0">學習任務追蹤（任務建立後 7 天內每日推播）</h2>
    ${taskBlocks
      .map((t) => {
        const rows = t.students
          .map((s) => {
            const vRate = s.videoCompletionRate === null ? "—" : `${s.videoCompletionRate}%`;
            const qRate = s.quizCompletionRate === null ? "—" : `${s.quizCompletionRate}%`;
            return `<tr>
              <td>${escapeHtml(s.name)}</td>
              <td>${s.completedVideos}/${t.totalVideos}（${vRate}）</td>
              <td>${s.completedQuizzes}/${t.totalQuizzes}（${qRate}）</td>
              <td>影片 +${s.todayNewVideoCompletions}、測驗 +${s.todayNewQuizAttempts}</td>
            </tr>`;
          })
          .join("");

        const incompleteList =
          t.incompleteStudents.length === 0
            ? "<p style=\"margin:0;color:#0f172a\">今日全部完成。</p>"
            : `<ul style="margin:8px 0 0 18px">${t.incompleteStudents
                .slice(0, 20)
                .map((s) => `<li>${escapeHtml(s.name)}</li>`)
                .join("")}</ul>`;

        return `
          <h3 style="margin:12px 0 6px 0">${escapeHtml(t.className)}｜${escapeHtml(t.title)}</h3>
          <p style="margin:0 0 8px 0;color:#334155">期間：${escapeHtml(t.startDate)} ～ ${escapeHtml(t.endDate)}</p>
          <table width="100%" border="1" cellspacing="0" cellpadding="6" style="border-collapse:collapse;margin:8px 0 12px 0">
            <tr><th align="left">學生</th><th align="left">影片進度</th><th align="left">測驗進度</th><th align="left">今日新增</th></tr>
            ${rows || `<tr><td colspan="4">目前沒有可統計學生資料。</td></tr>`}
          </table>
          <div style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc">
            <p style="margin:0;font-weight:600;color:#0f172a">未完成名單</p>
            ${incompleteList}
          </div>
        `;
      })
      .join("")}
  `;

  return { tasks: taskBlocks, html, warnings };
}

