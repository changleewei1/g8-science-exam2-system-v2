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
  totalStudents: number;
  completedCount: number;
  completionRate: number;
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
  async getOverview(examScopeId: string): Promise<StudentOverviewRow[]> {
    const supabase = getSupabaseAdmin();
    const { data: students } = await supabase
      .from("students")
      .select("id, student_code, name, class_name")
      .eq("is_active", true)
      .order("student_code");

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

    const studentRows = (students ?? []) as {
      id: string;
      student_code: string;
      name: string;
      class_name: string | null;
    }[];
    const studentIdList = studentRows.map((s) => s.id);

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
        taskCompletionRate: null,
        lastActivityAt: lastActivityByStudent.get(st.id) ?? null,
      });
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

  async getVideoWatchStats(examScopeId: string): Promise<VideoWatchStats[]> {
    const supabase = getSupabaseAdmin();
    const { data: units } = await supabase
      .from("scope_units")
      .select("id")
      .eq("exam_scope_id", examScopeId);
    const unitIds = (units ?? []).map((u: { id: string }) => u.id);
    const { data: videos } = await supabase
      .from("videos")
      .select("id, title")
      .in("unit_id", unitIds)
      .order("sort_order");

    const { count: totalStudents } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const ts = totalStudents ?? 0;
    const out: VideoWatchStats[] = [];

    for (const v of videos ?? []) {
      const vid = v as { id: string; title: string };
      const { data: vp } = await supabase
        .from("student_video_progress")
        .select("is_completed")
        .eq("video_id", vid.id);
      const completed = (vp ?? []).filter((x: { is_completed: boolean }) => x.is_completed)
        .length;
      const completionRate = ts === 0 ? 0 : Math.round((completed / ts) * 1000) / 10;
      out.push({
        videoId: vid.id,
        title: vid.title,
        totalStudents: ts,
        completedCount: completed,
        completionRate,
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
