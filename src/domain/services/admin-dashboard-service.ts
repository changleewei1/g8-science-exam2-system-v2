import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type StudentOverviewRow = {
  studentId: string;
  studentCode: string;
  name: string;
  className: string | null;
  videoCompletionRate: number;
  quizPassRate: number;
  /** 任務完成率：需與學習任務綁定時才顯示，未串接時為 null */
  taskCompletionRate: number | null;
  /** 最近一次觀看影片時間（ISO） */
  lastActivityAt: string | null;
};

export type VideoWatchStats = {
  videoId: string;
  title: string;
  unitTitle: string;
  totalStudents: number;
  completedCount: number;
  completionRate: number;
  avgQuizPassRate: number;
};

export type OverviewQueryOptions = {
  classId?: string;
  keyword?: string;
};

export type TrackingSummary = {
  studentCount: number;
  avgVideoCompletion: number;
  avgQuizPassRate: number;
  incompleteCount: number;
};

export type SkillPerformanceRow = {
  skillCode: string;
  skillName: string;
  correctRate: number;
  attempts: number;
};

/**
 * 老師儀表板：全班完成／通過概況、單支影片統計、skill 答題表現。
 */
export class AdminDashboardService {
  async getOverview(
    examScopeId: string,
    options: OverviewQueryOptions = {},
  ): Promise<StudentOverviewRow[]> {
    const supabase = getSupabaseAdmin();
    let studentQuery = supabase
      .from("students")
      .select("id, student_code, name, class_name")
      .eq("is_active", true)
      .order("student_code");

    if (options.classId && options.classId !== "all") {
      studentQuery = studentQuery.eq("class_name", options.classId);
    }

    const { data: students } = await studentQuery;

    const { data: units } = await supabase
      .from("scope_units")
      .select("id")
      .eq("exam_scope_id", examScopeId);
    const unitIds = (units ?? []).map((u: { id: string }) => u.id);
    if (unitIds.length === 0) return [];

    const { data: videos } = await supabase.from("videos").select("id").in("unit_id", unitIds);
    const videoIds = (videos ?? []).map((v: { id: string }) => v.id);
    const totalVideos = videoIds.length;

    const { data: quizzes } = await supabase.from("quizzes").select("id").in("video_id", videoIds);
    const quizIds = (quizzes ?? []).map((q: { id: string }) => q.id);

    let studentRows = (students ?? []) as {
      id: string;
      student_code: string;
      name: string;
      class_name: string | null;
    }[];

    const kw = options.keyword?.trim().toLowerCase();
    if (kw) {
      studentRows = studentRows.filter(
        (s) =>
          s.name.toLowerCase().includes(kw) ||
          s.student_code.toLowerCase().includes(kw),
      );
    }

    const studentIdList = studentRows.map((s) => s.id);
    const taskRateByStudent = await this.buildTaskCompletionRates(studentRows, videoIds);

    const lastActivityByStudent = new Map<string, string>();
    if (studentIdList.length > 0 && videoIds.length > 0) {
      const { data: progRows } = await supabase
        .from("student_video_progress")
        .select("student_id, last_viewed_at")
        .in("student_id", studentIdList)
        .in("video_id", videoIds);
      for (const row of progRows ?? []) {
        const r = row as { student_id: string; last_viewed_at: string | null };
        if (!r.last_viewed_at) continue;
        const prev = lastActivityByStudent.get(r.student_id);
        if (!prev || r.last_viewed_at > prev) {
          lastActivityByStudent.set(r.student_id, r.last_viewed_at);
        }
      }
    }

    const out: StudentOverviewRow[] = [];
    for (const s of studentRows) {
      const st = s;

      let videoCompletionRate = 0;
      if (totalVideos > 0) {
        const { data: vp } = await supabase
          .from("student_video_progress")
          .select("is_completed")
          .eq("student_id", st.id)
          .in("video_id", videoIds);
        const done = (vp ?? []).filter((x: { is_completed: boolean }) => x.is_completed).length;
        videoCompletionRate = Math.round((done / totalVideos) * 1000) / 10;
      }

      let quizPassRate = 0;
      if (quizIds.length > 0) {
        const { data: att } = await supabase
          .from("student_quiz_attempts")
          .select("is_passed")
          .eq("student_id", st.id)
          .in("quiz_id", quizIds)
          .not("submitted_at", "is", null);
        const list = att ?? [];
        if (list.length > 0) {
          const passed = list.filter((x: { is_passed: boolean }) => x.is_passed).length;
          quizPassRate = Math.round((passed / list.length) * 1000) / 10;
        }
      }

      out.push({
        studentId: st.id,
        studentCode: st.student_code,
        name: st.name,
        className: st.class_name,
        videoCompletionRate,
        quizPassRate,
        taskCompletionRate: taskRateByStudent.get(st.id) ?? null,
        lastActivityAt: lastActivityByStudent.get(st.id) ?? null,
      });
    }
    return out;
  }

  computeSummary(rows: StudentOverviewRow[]): TrackingSummary {
    if (rows.length === 0) {
      return {
        studentCount: 0,
        avgVideoCompletion: 0,
        avgQuizPassRate: 0,
        incompleteCount: 0,
      };
    }
    const avgVideo =
      Math.round(
        (rows.reduce((s, r) => s + r.videoCompletionRate, 0) / rows.length) * 10,
      ) / 10;
    const avgQuiz =
      Math.round((rows.reduce((s, r) => s + r.quizPassRate, 0) / rows.length) * 10) / 10;
    const incompleteCount = rows.filter(
      (r) => r.videoCompletionRate < 100 || r.quizPassRate < 100,
    ).length;
    return {
      studentCount: rows.length,
      avgVideoCompletion: avgVideo,
      avgQuizPassRate: avgQuiz,
      incompleteCount,
    };
  }

  private async buildTaskCompletionRates(
    students: { id: string; class_name: string | null }[],
    videoIds: string[],
  ): Promise<Map<string, number | null>> {
    const out = new Map<string, number | null>();
    if (videoIds.length === 0 || students.length === 0) {
      for (const s of students) out.set(s.id, null);
      return out;
    }

    const supabase = getSupabaseAdmin();
    const { data: tvRows } = await supabase
      .from("task_videos")
      .select("task_id, video_id")
      .in("video_id", videoIds);
    const taskIds = [...new Set((tvRows ?? []).map((r: { task_id: string }) => r.task_id))];
    if (taskIds.length === 0) {
      for (const s of students) out.set(s.id, null);
      return out;
    }

    const { data: tasks } = await supabase
      .from("learning_tasks")
      .select("id, class_name, start_date")
      .in("id", taskIds)
      .order("start_date", { ascending: false });

    const videosByTask = new Map<string, string[]>();
    for (const row of tvRows ?? []) {
      const r = row as { task_id: string; video_id: string };
      const list = videosByTask.get(r.task_id) ?? [];
      list.push(r.video_id);
      videosByTask.set(r.task_id, list);
    }

    const latestTaskByClass = new Map<string, { id: string; videoIds: string[] }>();
    for (const t of tasks ?? []) {
      const row = t as { id: string; class_name: string };
      if (latestTaskByClass.has(row.class_name)) continue;
      const vids = videosByTask.get(row.id) ?? [];
      if (vids.length === 0) continue;
      latestTaskByClass.set(row.class_name, { id: row.id, videoIds: vids });
    }

    for (const s of students) {
      const cls = s.class_name;
      if (!cls) {
        out.set(s.id, null);
        continue;
      }
      const task = latestTaskByClass.get(cls);
      if (!task) {
        out.set(s.id, null);
        continue;
      }

      const { data: stp } = await supabase
        .from("student_task_progress")
        .select("is_completed")
        .eq("student_id", s.id)
        .eq("task_id", task.id)
        .in("video_id", task.videoIds);

      const total = task.videoIds.length;
      const done = (stp ?? []).filter((x: { is_completed: boolean }) => x.is_completed).length;
      out.set(s.id, total === 0 ? null : Math.round((done / total) * 1000) / 10);
    }
    return out;
  }

  async getStudentDetail(studentId: string, examScopeId: string) {
    const supabase = getSupabaseAdmin();
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("id", studentId)
      .maybeSingle();
    if (!student) return null;

    const { data: units } = await supabase
      .from("scope_units")
      .select("*")
      .eq("exam_scope_id", examScopeId)
      .order("sort_order");

    const unitIds = (units ?? []).map((u: { id: string }) => u.id);
    const { data: videos } = await supabase
      .from("videos")
      .select("*")
      .in("unit_id", unitIds)
      .order("sort_order");

    const videoIds = (videos ?? []).map((v: { id: string }) => v.id);
    const { data: progress } = await supabase
      .from("student_video_progress")
      .select("*")
      .eq("student_id", studentId)
      .in("video_id", videoIds);

    const { data: quizzes } = await supabase.from("quizzes").select("*").in("video_id", videoIds);
    const quizIds = (quizzes ?? []).map((q: { id: string }) => q.id);
    const { data: attempts } = await supabase
      .from("student_quiz_attempts")
      .select("*")
      .eq("student_id", studentId)
      .in("quiz_id", quizIds);

    return {
      student,
      units,
      videos,
      progress: progress ?? [],
      quizzes: quizzes ?? [],
      attempts: attempts ?? [],
    };
  }

  async getVideoWatchStats(
    examScopeId: string,
    options: OverviewQueryOptions = {},
  ): Promise<VideoWatchStats[]> {
    const supabase = getSupabaseAdmin();
    const { data: units } = await supabase
      .from("scope_units")
      .select("id, unit_title")
      .eq("exam_scope_id", examScopeId);
    const unitById = new Map<string, string>();
    for (const u of units ?? []) {
      const row = u as { id: string; unit_title: string };
      unitById.set(row.id, row.unit_title);
    }
    const unitIds = [...unitById.keys()];
    const { data: videos } = await supabase
      .from("videos")
      .select("id, title, unit_id")
      .in("unit_id", unitIds)
      .order("sort_order");

    let studentCountQuery = supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);
    if (options.classId && options.classId !== "all") {
      studentCountQuery = studentCountQuery.eq("class_name", options.classId);
    }
    const { count: totalStudents } = await studentCountQuery;

    const ts = totalStudents ?? 0;

    let scopedStudentQuery = supabase
      .from("students")
      .select("id")
      .eq("is_active", true);
    if (options.classId && options.classId !== "all") {
      scopedStudentQuery = scopedStudentQuery.eq("class_name", options.classId);
    }
    const { data: scopedStudents } = await scopedStudentQuery;
    const scopedStudentIds = new Set(
      (scopedStudents ?? []).map((s: { id: string }) => s.id),
    );

    const out: VideoWatchStats[] = [];
    const scopedIds = [...scopedStudentIds];

    for (const v of videos ?? []) {
      const vid = v as { id: string; title: string; unit_id: string };
      let progressRows: { student_id: string; is_completed: boolean }[] = [];
      if (scopedIds.length > 0) {
        const { data: vp } = await supabase
          .from("student_video_progress")
          .select("student_id, is_completed")
          .eq("video_id", vid.id)
          .in("student_id", scopedIds);
        progressRows = (vp ?? []) as { student_id: string; is_completed: boolean }[];
      }

      const completed = progressRows.filter((x) => x.is_completed).length;
      const completionRate = ts === 0 ? 0 : Math.round((completed / ts) * 1000) / 10;

      const { data: quiz } = await supabase
        .from("quizzes")
        .select("id")
        .eq("video_id", vid.id)
        .maybeSingle();

      let avgQuizPassRate = 0;
      if (quiz && scopedIds.length > 0) {
        const quizId = (quiz as { id: string }).id;
        const { data: att } = await supabase
          .from("student_quiz_attempts")
          .select("student_id, is_passed")
          .eq("quiz_id", quizId)
          .not("submitted_at", "is", null)
          .in("student_id", scopedIds);

        const attempts = (att ?? []) as { student_id: string; is_passed: boolean }[];
        if (attempts.length > 0) {
          const passed = attempts.filter((x: { is_passed: boolean }) => x.is_passed).length;
          avgQuizPassRate = Math.round((passed / attempts.length) * 1000) / 10;
        }
      }

      out.push({
        videoId: vid.id,
        title: vid.title,
        unitTitle: unitById.get(vid.unit_id) ?? "—",
        totalStudents: ts,
        completedCount: completed,
        completionRate,
        avgQuizPassRate,
      });
    }
    return out;
  }

  async getVideoSkillPerformance(videoId: string): Promise<SkillPerformanceRow[]> {
    const supabase = getSupabaseAdmin();
    const { data: quiz } = await supabase.from("quizzes").select("id").eq("video_id", videoId).maybeSingle();
    if (!quiz) return [];
    const quizId = (quiz as { id: string }).id;

    const { data: attempts } = await supabase.from("student_quiz_attempts").select("id").eq("quiz_id", quizId);
    const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
    if (attemptIds.length === 0) return [];

    const { data: answers } = await supabase
      .from("student_quiz_answers")
      .select("is_correct, quiz_questions(skill_code)")
      .in("attempt_id", attemptIds);

    const map = new Map<string, { ok: number; n: number }>();
    for (const row of answers ?? []) {
      const r = row as unknown as {
        is_correct: boolean;
        quiz_questions: { skill_code: string } | null;
      };
      const code = r.quiz_questions?.skill_code ?? "—";
      const cur = map.get(code) ?? { ok: 0, n: 0 };
      cur.n += 1;
      if (r.is_correct) cur.ok += 1;
      map.set(code, cur);
    }

    const { data: tagRows } = await supabase.from("skill_tags").select("code, name");
    const nameByCode = new Map<string, string>();
    for (const t of tagRows ?? []) {
      const row = t as { code: string; name: string };
      nameByCode.set(row.code, row.name);
    }

    return [...map.entries()].map(([skillCode, v]) => ({
      skillCode,
      skillName: nameByCode.get(skillCode) ?? skillCode,
      attempts: v.n,
      correctRate: v.n === 0 ? 0 : Math.round((v.ok / v.n) * 1000) / 10,
    }));
  }
}
