import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type StudentDigestRow = {
  studentId: string;
  studentName: string;
  className: string | null;
  videoCompletionRate: number;
  quizCompletionRate: number;
  weakestSkills: { skillCode: string; skillName: string; accuracy: number }[];
  suggestion: string;
  warnings: string[];
  hasIncompleteTask: boolean;
};

export type StudentWeaknessAnalysisResult = {
  students: StudentDigestRow[];
  skillNameByCode: Map<string, string>;
  byStudentSkill: Map<string, Map<string, { total: number; correct: number }>>;
  warnings: string[];
};

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export class StudentWeaknessAnalysisService {
  async analyzeDailyDigest(): Promise<StudentWeaknessAnalysisResult> {
    const supabase = getSupabaseAdmin();
    const warnings: string[] = [];

    const { data: studentRows, error: studentsError } = await supabase
      .from("students")
      .select("id, name, class_name, is_active")
      .eq("is_active", true)
      .order("class_name", { ascending: true })
      .order("name", { ascending: true });
    if (studentsError) throw studentsError;
    if (!studentRows?.length) return { students: [], skillNameByCode: new Map(), byStudentSkill: new Map(), warnings: ["目前沒有可用學生資料。"] };

    const students = studentRows as { id: string; name: string; class_name: string | null }[];
    const studentIds = students.map((s) => s.id);

    const { data: skillRows, error: skillError } = await supabase
      .from("skill_tags")
      .select("code, name");
    if (skillError) warnings.push("讀取 skill_tags 失敗，將以 skill_code 顯示。");
    const skillNameByCode = new Map<string, string>();
    for (const row of skillRows ?? []) {
      const r = row as { code: string; name: string };
      skillNameByCode.set(r.code, r.name);
    }
    if (skillNameByCode.size === 0) warnings.push("資料庫沒有 skill_tags，弱點名稱將以代碼呈現。");

    const today = new Date().toISOString().slice(0, 10);
    const { data: taskRows } = await supabase
      .from("learning_tasks")
      .select("id, class_name, start_date, end_date")
      .lte("start_date", today)
      .gte("end_date", today);
    const activeTasks = (taskRows ?? []) as {
      id: string;
      class_name: string;
      start_date: string;
      end_date: string;
    }[];

    const taskIds = activeTasks.map((t) => t.id);
    const classTask = new Map<string, string>();
    for (const task of activeTasks) {
      if (!classTask.has(task.class_name)) classTask.set(task.class_name, task.id);
    }

    const scopedVideoIdsByTask = new Map<string, string[]>();
    if (taskIds.length > 0) {
      const { data: tvRows } = await supabase
        .from("task_videos")
        .select("task_id, video_id")
        .in("task_id", taskIds);
      for (const row of tvRows ?? []) {
        const r = row as { task_id: string; video_id: string };
        const list = scopedVideoIdsByTask.get(r.task_id) ?? [];
        list.push(r.video_id);
        scopedVideoIdsByTask.set(r.task_id, list);
      }
    }

    const { data: attemptRows } = await supabase
      .from("student_quiz_attempts")
      .select("id, student_id, quiz_id")
      .in("student_id", studentIds)
      .not("submitted_at", "is", null);
    const attempts = (attemptRows ?? []) as { id: string; student_id: string; quiz_id: string }[];
    const attemptIds = attempts.map((a) => a.id);

    const { data: answerRows } = attemptIds.length
      ? await supabase
          .from("student_quiz_answers")
          .select("attempt_id, question_id, is_correct")
          .in("attempt_id", attemptIds)
      : { data: [] as unknown[] };
    const answers = (answerRows ?? []) as {
      attempt_id: string;
      question_id: string;
      is_correct: boolean;
    }[];

    const questionIds = [...new Set(answers.map((a) => a.question_id))];
    const { data: questionRows } = questionIds.length
      ? await supabase
          .from("quiz_questions")
          .select("id, skill_code")
          .in("id", questionIds)
      : { data: [] as unknown[] };
    const questionSkill = new Map<string, string>();
    for (const row of questionRows ?? []) {
      const r = row as { id: string; skill_code: string };
      questionSkill.set(r.id, r.skill_code);
    }

    const byAttempt = new Map<string, { studentId: string; quizId: string }>();
    for (const a of attempts) byAttempt.set(a.id, { studentId: a.student_id, quizId: a.quiz_id });

    const byStudentSkill = new Map<string, Map<string, { total: number; correct: number }>>();
    for (const ans of answers) {
      const attempt = byAttempt.get(ans.attempt_id);
      if (!attempt) continue;
      const skillCode = questionSkill.get(ans.question_id);
      if (!skillCode) continue;
      const studentMap = byStudentSkill.get(attempt.studentId) ?? new Map();
      const current = studentMap.get(skillCode) ?? { total: 0, correct: 0 };
      current.total += 1;
      if (ans.is_correct) current.correct += 1;
      studentMap.set(skillCode, current);
      byStudentSkill.set(attempt.studentId, studentMap);
    }

    const quizIdsByVideo = new Map<string, string[]>();
    const allTaskVideoIds = [...new Set([...scopedVideoIdsByTask.values()].flat())];
    if (allTaskVideoIds.length > 0) {
      const { data: quizRows } = await supabase
        .from("quizzes")
        .select("id, video_id")
        .in("video_id", allTaskVideoIds);
      for (const row of quizRows ?? []) {
        const r = row as { id: string; video_id: string };
        const list = quizIdsByVideo.get(r.video_id) ?? [];
        list.push(r.id);
        quizIdsByVideo.set(r.video_id, list);
      }
    }

    const { data: progressRows } = await supabase
      .from("student_video_progress")
      .select("student_id, video_id, is_completed")
      .in("student_id", studentIds);
    const completedByStudentVideo = new Set<string>();
    for (const row of progressRows ?? []) {
      const r = row as { student_id: string; video_id: string; is_completed: boolean };
      if (r.is_completed) completedByStudentVideo.add(`${r.student_id}:${r.video_id}`);
    }

    const attemptedQuizByStudent = new Set<string>();
    for (const a of attempts) attemptedQuizByStudent.add(`${a.student_id}:${a.quiz_id}`);

    const resultStudents: StudentDigestRow[] = [];
    for (const s of students) {
      const warningsForStudent: string[] = [];
      const taskId = s.class_name ? classTask.get(s.class_name) ?? null : null;
      const scopedVideos = taskId ? scopedVideoIdsByTask.get(taskId) ?? [] : [];

      if (!taskId) warningsForStudent.push("此班級今日無進行中的學習任務。");
      if (taskId && scopedVideos.length === 0) warningsForStudent.push("此任務尚未配置影片。");

      let completedVideos = 0;
      for (const vid of scopedVideos) {
        if (completedByStudentVideo.has(`${s.id}:${vid}`)) completedVideos += 1;
      }
      const videoCompletionRate = toPercent(completedVideos, scopedVideos.length);

      const scopedQuizIds = [...new Set(scopedVideos.flatMap((v) => quizIdsByVideo.get(v) ?? []))];
      let completedQuizzes = 0;
      for (const quizId of scopedQuizIds) {
        if (attemptedQuizByStudent.has(`${s.id}:${quizId}`)) completedQuizzes += 1;
      }
      const quizCompletionRate = toPercent(completedQuizzes, scopedQuizIds.length);

      const skillStats = byStudentSkill.get(s.id) ?? new Map<string, { total: number; correct: number }>();
      const weakest = [...skillStats.entries()]
        .map(([skillCode, stat]) => {
          const accuracy = toPercent(stat.correct, stat.total);
          return {
            skillCode,
            skillName: skillNameByCode.get(skillCode) ?? skillCode,
            accuracy,
            total: stat.total,
          };
        })
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 3)
        .map(({ skillCode, skillName, accuracy }) => ({ skillCode, skillName, accuracy }));

      if (weakest.length === 0) warningsForStudent.push("資料不足，建議先完成更多測驗。");

      const suggestion =
        weakest.length === 0
          ? `${s.name} 目前測驗資料不足，建議先完成今日任務中的影片與小測，再進行弱點分析。`
          : `${s.name} 目前在「${weakest.map((w) => w.skillName).join("」、「")}」較不穩定，建議先重看相關影片，再完成對應小測。`;

      resultStudents.push({
        studentId: s.id,
        studentName: s.name,
        className: s.class_name,
        videoCompletionRate,
        quizCompletionRate,
        weakestSkills: weakest,
        suggestion,
        warnings: warningsForStudent,
        hasIncompleteTask: scopedVideos.length > 0 && (videoCompletionRate < 100 || quizCompletionRate < 100),
      });
    }

    return {
      students: resultStudents,
      skillNameByCode,
      byStudentSkill,
      warnings,
    };
  }
}
