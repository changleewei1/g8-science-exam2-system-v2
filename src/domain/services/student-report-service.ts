import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type RadarDatum = {
  skillCode: string;
  skillName: string;
  total: number;
  correct: number;
  accuracy: number;
};

export type GanttItem = {
  videoId: string;
  title: string;
  dayIndex: number;
  plannedDate: string;
  completedAt: string | null;
  status: "on_time" | "late" | "incomplete";
};

export type GanttBlock = {
  taskId: string;
  taskTitle: string;
  startDate: string;
  endDate: string;
  items: GanttItem[];
};

export type UnitBarDatum = {
  unitTitle: string;
  videoCompletionRate: number;
  quizPassRate: number;
};

export type ReportSummary = {
  totalVideos: number;
  completedVideos: number;
  videoCompletionRate: number;
  totalQuizzes: number;
  passedQuizzes: number;
  quizPassRate: number;
  weakSkills: { skillCode: string; skillName: string; accuracy: number }[];
  suggestedVideos: { videoId: string; title: string; reason: string }[];
  paragraphs: string[];
  /** 給教師／家長的觀察重點 */
  teacherInsight: string[];
  /** 給學生的簡短說明 */
  studentInsight: string[];
};

export type StudentReportDto = {
  generatedAt: string;
  audience: "admin" | "parent";
  student: {
    displayName: string;
    className: string | null;
    studentCode?: string;
  };
  examScope: { id: string; title: string } | null;
  task: { id: string; title: string; startDate: string; endDate: string } | null;
  radar: RadarDatum[];
  gantt: GanttBlock | null;
  pieVideo: { completed: number; incomplete: number };
  barUnits: UnitBarDatum[];
  summary: ReportSummary;
};

function addDaysIso(dateStr: string, add: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + add);
  return d.toISOString().slice(0, 10);
}

function dateOnly(iso: string | null): string | null {
  if (!iso) return null;
  return iso.slice(0, 10);
}

/**
 * 單一學生學習報告：雷達、甘特、圓餅／長條、文字摘要。
 */
export class StudentReportService {
  async buildReport(input: {
    studentId: string;
    examScopeId?: string | null;
    taskId?: string | null;
    audience: "admin" | "parent";
  }): Promise<StudentReportDto | null> {
    const supabase = getSupabaseAdmin();
    const { data: studentRow } = await supabase
      .from("students")
      .select("id, name, student_code, class_name")
      .eq("id", input.studentId)
      .maybeSingle();
    if (!studentRow) return null;

    const student = studentRow as {
      id: string;
      name: string;
      student_code: string;
      class_name: string | null;
    };

    let examScopeId = input.examScopeId ?? null;
    if (!examScopeId) {
      const { data: scope } = await supabase
        .from("exam_scopes")
        .select("id")
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      examScopeId = scope?.id ?? null;
    }

    let examScopeTitle: string | null = null;
    if (examScopeId) {
      const { data: es } = await supabase
        .from("exam_scopes")
        .select("title")
        .eq("id", examScopeId)
        .maybeSingle();
      examScopeTitle = (es as { title: string } | null)?.title ?? null;
    }

    const { data: skillTags } = await supabase.from("skill_tags").select("code, name");
    const skillNameByCode = new Map<string, string>();
    for (const t of skillTags ?? []) {
      const row = t as { code: string; name: string };
      skillNameByCode.set(row.code, row.name);
    }

    const radar = await this.buildRadar(supabase, student.id, skillNameByCode);

    const unitIds: string[] = [];
    const videoIdsInScope: string[] = [];
    const unitsMeta: { id: string; title: string }[] = [];

    if (examScopeId) {
      const { data: units } = await supabase
        .from("scope_units")
        .select("id, unit_title")
        .eq("exam_scope_id", examScopeId)
        .order("sort_order");
      for (const u of units ?? []) {
        const row = u as { id: string; unit_title: string };
        unitIds.push(row.id);
        unitsMeta.push({ id: row.id, title: row.unit_title });
      }
      if (unitIds.length > 0) {
        const { data: vids } = await supabase
          .from("videos")
          .select("id")
          .in("unit_id", unitIds)
          .order("sort_order");
        for (const v of vids ?? []) videoIdsInScope.push((v as { id: string }).id);
      }
    }

    const videoQuiz = await this.buildVideoQuizStats(
      supabase,
      student.id,
      unitsMeta,
      videoIdsInScope,
    );
    const pieVideo = videoQuiz.progress;
    const barUnits = videoQuiz.barUnits;

    const gantt = await this.buildGantt(
      supabase,
      student.id,
      student.class_name,
      input.taskId ?? null,
    );

    let summary = this.buildSummary(radar, pieVideo, videoQuiz.quizTotalInScope, videoQuiz.quizPassedCount);

    const weakCodes = summary.weakSkills.map((w) => w.skillCode);
    summary = await this.withSuggestedVideos(supabase, summary, weakCodes);

    const displayStudent =
      input.audience === "admin"
        ? {
            displayName: student.name,
            className: student.class_name,
            studentCode: student.student_code,
          }
        : {
            displayName: student.name,
            className: student.class_name,
          };

    return {
      generatedAt: new Date().toISOString(),
      audience: input.audience,
      student: displayStudent,
      examScope: examScopeId && examScopeTitle ? { id: examScopeId, title: examScopeTitle } : null,
      task: gantt
        ? {
            id: gantt.taskId,
            title: gantt.taskTitle,
            startDate: gantt.startDate,
            endDate: gantt.endDate,
          }
        : null,
      radar,
      gantt,
      pieVideo,
      barUnits,
      summary,
    };
  }

  private async buildRadar(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    studentId: string,
    skillNameByCode: Map<string, string>,
  ): Promise<RadarDatum[]> {
    const { data: attempts } = await supabase
      .from("student_quiz_attempts")
      .select("id")
      .eq("student_id", studentId)
      .not("submitted_at", "is", null);
    const attemptIds = (attempts ?? []).map((a: { id: string }) => a.id);
    if (attemptIds.length === 0) return [];

    const { data: answers } = await supabase
      .from("student_quiz_answers")
      .select("is_correct, question_id")
      .in("attempt_id", attemptIds);
    if (!answers?.length) return [];

    const questionIds = [...new Set((answers as { question_id: string }[]).map((x) => x.question_id))];
    if (questionIds.length === 0) return [];
    const { data: questions } = await supabase
      .from("quiz_questions")
      .select("id, skill_code")
      .in("id", questionIds);
    const skillByQuestion = new Map<string, string>();
    for (const q of questions ?? []) {
      const row = q as { id: string; skill_code: string };
      skillByQuestion.set(row.id, row.skill_code);
    }

    const map = new Map<string, { ok: number; n: number }>();
    for (const row of answers ?? []) {
      const r = row as { is_correct: boolean; question_id: string };
      const skillCode = skillByQuestion.get(r.question_id) ?? "—";
      const cur = map.get(skillCode) ?? { ok: 0, n: 0 };
      cur.n += 1;
      if (r.is_correct) cur.ok += 1;
      map.set(skillCode, cur);
    }

    return [...map.entries()].map(([skillCode, v]) => {
      const accuracy = v.n === 0 ? 0 : Math.round((v.ok / v.n) * 1000) / 10;
      return {
        skillCode,
        skillName: skillNameByCode.get(skillCode) ?? skillCode,
        total: v.n,
        correct: v.ok,
        accuracy,
      };
    });
  }

  private async buildVideoQuizStats(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    studentId: string,
    unitsMeta: { id: string; title: string }[],
    videoIdsInScope: string[],
  ): Promise<{
    progress: { completed: number; incomplete: number };
    barUnits: UnitBarDatum[];
    quizTotalInScope: number;
    quizPassedCount: number;
  }> {
    if (videoIdsInScope.length === 0) {
      return {
        progress: { completed: 0, incomplete: 0 },
        barUnits: [],
        quizTotalInScope: 0,
        quizPassedCount: 0,
      };
    }

    const { data: vp } = await supabase
      .from("student_video_progress")
      .select("video_id, is_completed")
      .eq("student_id", studentId)
      .in("video_id", videoIdsInScope);

    const doneSet = new Set<string>();
    for (const row of vp ?? []) {
      const r = row as { video_id: string; is_completed: boolean };
      if (r.is_completed) doneSet.add(r.video_id);
    }
    const completed = doneSet.size;
    const incomplete = videoIdsInScope.length - completed;

    const { data: scopeQuizzes } = await supabase
      .from("quizzes")
      .select("id")
      .in("video_id", videoIdsInScope);
    const allQuizIds = [...new Set((scopeQuizzes ?? []).map((q: { id: string }) => q.id))];
    let quizPassedCount = 0;
    if (allQuizIds.length > 0) {
      const { data: att } = await supabase
        .from("student_quiz_attempts")
        .select("quiz_id, is_passed")
        .eq("student_id", studentId)
        .in("quiz_id", allQuizIds)
        .not("submitted_at", "is", null);
      const passed = new Set<string>();
      for (const a of att ?? []) {
        const row = a as { quiz_id: string; is_passed: boolean };
        if (row.is_passed) passed.add(row.quiz_id);
      }
      quizPassedCount = passed.size;
    }

    const barUnits: UnitBarDatum[] = [];
    for (const u of unitsMeta) {
      const { data: vids } = await supabase
        .from("videos")
        .select("id")
        .eq("unit_id", u.id)
        .order("sort_order");
      const vidList = (vids ?? []).map((x: { id: string }) => x.id);
      if (vidList.length === 0) {
        barUnits.push({ unitTitle: u.title, videoCompletionRate: 0, quizPassRate: 0 });
        continue;
      }
      let uDone = 0;
      for (const vid of vidList) {
        if (doneSet.has(vid)) uDone += 1;
      }
      const videoCompletionRate =
        vidList.length === 0 ? 0 : Math.round((uDone / vidList.length) * 1000) / 10;

      const { data: quizzes } = await supabase.from("quizzes").select("id").in("video_id", vidList);
      const quizIds = (quizzes ?? []).map((q: { id: string }) => q.id);
      let quizPassRate = 0;
      if (quizIds.length > 0) {
        const { data: att } = await supabase
          .from("student_quiz_attempts")
          .select("quiz_id, is_passed")
          .eq("student_id", studentId)
          .in("quiz_id", quizIds)
          .not("submitted_at", "is", null);
        const passedByQuiz = new Map<string, boolean>();
        for (const a of att ?? []) {
          const row = a as { quiz_id: string; is_passed: boolean };
          if (row.is_passed) passedByQuiz.set(row.quiz_id, true);
        }
        const passed = [...passedByQuiz.values()].filter(Boolean).length;
        quizPassRate =
          quizIds.length === 0 ? 0 : Math.round((passed / quizIds.length) * 1000) / 10;
      }

      barUnits.push({ unitTitle: u.title, videoCompletionRate, quizPassRate });
    }

    return {
      progress: { completed, incomplete },
      barUnits,
      quizTotalInScope: allQuizIds.length,
      quizPassedCount,
    };
  }

  private async buildGantt(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    studentId: string,
    className: string | null,
    preferredTaskId: string | null,
  ): Promise<GanttBlock | null> {
    let task: {
      id: string;
      title: string;
      start_date: string;
      end_date: string;
    } | null = null;

    if (preferredTaskId) {
      const { data: t } = await supabase
        .from("learning_tasks")
        .select("id, title, start_date, end_date, class_name")
        .eq("id", preferredTaskId)
        .maybeSingle();
      const row = t as {
        id: string;
        title: string;
        start_date: string;
        end_date: string;
        class_name: string;
      } | null;
      if (row) {
        let assigneeIds: string[] = [];
        try {
          const { data: asg } = await supabase
            .from("learning_task_assignees")
            .select("student_id")
            .eq("task_id", row.id);
          assigneeIds = (asg ?? []).map((x: { student_id: string }) => x.student_id);
        } catch {
          assigneeIds = [];
        }
        if (assigneeIds.length > 0) {
          if (assigneeIds.includes(studentId)) task = row;
        } else if (className && row.class_name === className) {
          task = row;
        }
      }
    }
    if (!task && className) {
      const { data: t } = await supabase
        .from("learning_tasks")
        .select("id, title, start_date, end_date")
        .eq("class_name", className)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      task = t as typeof task;
    }
    if (!task) return null;

    const { data: tvs } = await supabase
      .from("task_videos")
      .select("video_id, day_index")
      .eq("task_id", task.id)
      .order("day_index");

    const { data: stp } = await supabase
      .from("student_task_progress")
      .select("video_id, is_completed, completed_at")
      .eq("student_id", studentId)
      .eq("task_id", task.id);

    const stpMap = new Map<string, { completed_at: string | null; is_completed: boolean }>();
    for (const r of stp ?? []) {
      const row = r as { video_id: string; is_completed: boolean; completed_at: string | null };
      stpMap.set(row.video_id, { completed_at: row.completed_at, is_completed: row.is_completed });
    }

    const items: GanttItem[] = [];
    for (const row of tvs ?? []) {
      const tv = row as { video_id: string; day_index: number };
      const plannedDate = addDaysIso(task.start_date, tv.day_index - 1);
      const { data: v } = await supabase
        .from("videos")
        .select("title")
        .eq("id", tv.video_id)
        .maybeSingle();
      const title = (v as { title: string } | null)?.title ?? "影片";

      const prog = stpMap.get(tv.video_id);
      const completedAt = prog?.is_completed ? prog.completed_at : null;
      const completedDay = dateOnly(completedAt);

      let status: GanttItem["status"] = "incomplete";
      if (completedDay) {
        if (completedDay <= plannedDate) status = "on_time";
        else status = "late";
      }

      items.push({
        videoId: tv.video_id,
        title,
        dayIndex: tv.day_index,
        plannedDate,
        completedAt,
        status,
      });
    }

    if (items.length === 0) return null;

    return {
      taskId: task.id,
      taskTitle: task.title,
      startDate: task.start_date,
      endDate: task.end_date,
      items,
    };
  }

  private buildSummary(
    radar: RadarDatum[],
    pie: { completed: number; incomplete: number },
    quizTotalInScope: number,
    quizPassedCount: number,
  ): ReportSummary {
    const totalVideos = pie.completed + pie.incomplete;
    const completedVideos = pie.completed;
    const videoCompletionRate =
      totalVideos === 0 ? 0 : Math.round((completedVideos / totalVideos) * 1000) / 10;

    const totalQuizzes = quizTotalInScope;
    const passedQuizzes = quizPassedCount;
    const quizPassRate =
      totalQuizzes === 0 ? 0 : Math.round((passedQuizzes / totalQuizzes) * 1000) / 10;

    const weakSkills = radar
      .filter((r) => r.accuracy < 60 && r.total >= 1)
      .map((r) => ({
        skillCode: r.skillCode,
        skillName: r.skillName,
        accuracy: r.accuracy,
      }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    const paragraphs: string[] = [];
    paragraphs.push(
      `在學習範圍內共有 ${totalVideos} 支影片，已完成 ${completedVideos} 支，整體完成率約 ${videoCompletionRate}%。`,
    );

    paragraphs.push(
      `測驗方面，範圍內共有 ${totalQuizzes} 份測驗，已通過 ${passedQuizzes} 份，通過比例約 ${quizPassRate}%。`,
    );

    if (weakSkills.length === 0) {
      paragraphs.push("各面向答題表現均衡，建議持續複習並搭配實作練習。");
    }

    const teacherInsight: string[] = [
      `本次學習範圍影片完成率為 ${videoCompletionRate}%，測驗通過率約 ${quizPassRate}%。`,
    ];
    if (weakSkills.length > 0) {
      teacherInsight.push(
        `學生在「${weakSkills
          .slice(0, 4)
          .map((w) => w.skillName)
          .join("、")}」等面向正答率偏低，建議安排再次複習與追蹤。`,
      );
    } else {
      teacherInsight.push("整體表現穩定，可鼓勵持續維持練習頻率。");
    }

    const studentInsight: string[] = [];
    if (videoCompletionRate >= 80) {
      studentInsight.push("你已完成大部分影片，建議針對測驗錯題再練習一次。");
    } else {
      studentInsight.push(
        `請依序完成影片與測驗；目前影片完成率約 ${videoCompletionRate}%。`,
      );
    }
    if (weakSkills.length > 0) {
      studentInsight.push(
        `可優先複習：${weakSkills
          .slice(0, 3)
          .map((w) => w.skillName)
          .join("、")}。`,
      );
    } else {
      studentInsight.push("各主題表現均衡，請再複習重點觀念後挑戰進階題。");
    }

    return {
      totalVideos,
      completedVideos,
      videoCompletionRate,
      totalQuizzes,
      passedQuizzes,
      quizPassRate,
      weakSkills,
      suggestedVideos: [],
      paragraphs,
      teacherInsight,
      studentInsight,
    };
  }

  private async withSuggestedVideos(
    supabase: ReturnType<typeof getSupabaseAdmin>,
    summary: ReportSummary,
    weakSkillCodes: string[],
  ): Promise<ReportSummary> {
    if (weakSkillCodes.length === 0) return summary;
    const suggested: { videoId: string; title: string; reason: string }[] = [];
    const seen = new Set<string>();

    for (const code of weakSkillCodes.slice(0, 3)) {
      const { data: tags } = await supabase
        .from("video_skill_tags")
        .select("video_id, skill_name")
        .eq("skill_code", code)
        .limit(5);
      for (const t of tags ?? []) {
        const row = t as { video_id: string; skill_name: string };
        if (seen.has(row.video_id)) continue;
        seen.add(row.video_id);
        const { data: v } = await supabase
          .from("videos")
          .select("title")
          .eq("id", row.video_id)
          .maybeSingle();
        const title = (v as { title: string } | null)?.title ?? "影片";
        suggested.push({
          videoId: row.video_id,
          title,
          reason: `與技能「${row.skill_name}」相關`,
        });
        if (suggested.length >= 3) break;
      }
      if (suggested.length >= 3) break;
    }

    const paragraphs = [...summary.paragraphs];
    if (suggested.length > 0) {
      paragraphs.push(
        `建議重新觀看相關影片並再次練習，例如：${suggested.map((s) => `《${s.title}》`).join("、")}，以加強觀念理解與應用能力。`,
      );
    }

    return {
      ...summary,
      suggestedVideos: suggested,
      paragraphs,
    };
  }
}
