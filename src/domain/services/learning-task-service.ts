import type { LearningTaskRepository, TaskVideoInsert } from "@/domain/repositories/learning-task-repository";
import type { StudentRepository } from "@/domain/repositories/student-repository";
import type { StudentTaskProgressRepository } from "@/domain/repositories/student-task-progress-repository";
import type { VideoRepository } from "@/domain/repositories/video-repository";
import type { Student } from "@/domain/entities/student";
import type { LearningTaskRow, StudentTaskProgressRow } from "@/types/database";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type CreateLearningTaskInput = {
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  className: string;
  videos: { videoId: string; dayIndex: number }[];
  /** 整班或指定多位學生 */
  assignmentMode: "class" | "students";
  /** assignmentMode 為 students 時必填至少一位 */
  studentIds: string[];
  isActive: boolean;
};

export type LearningTaskListItem = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  className: string;
  /** 列表「指派對象」欄：整班或已選人數 */
  assigneeDisplay: string;
  videoCount: number;
  aggregateCompletionRate: number;
  phase: "upcoming" | "active" | "ended";
  isActive: boolean;
};

export type AdminTaskStudentRow = {
  studentId: string;
  studentCode: string;
  name: string;
  completedCount: number;
  totalVideos: number;
  completionRate: number;
  isBehind: boolean;
};

export type AdminTaskProgressStudentRow = AdminTaskStudentRow & {
  className: string | null;
  quizzesPassed: number;
  quizzesTotal: number;
  quizSummary: string;
  lastActivityAt: string | null;
  statusLabel: "尚未開始" | "進行中" | "已完成" | "逾期未完成";
};

export type AdminTaskVideoRow = {
  videoId: string;
  dayIndex: number;
  title: string;
  unitTitle: string;
  skillCodes: string[];
  hasQuiz: boolean;
};

export type AdminTaskDetail = {
  task: {
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string;
    className: string;
    isActive: boolean;
    assignmentMode: "class" | "students";
    assigneeStudentIds: string[];
  };
  videos: AdminTaskVideoRow[];
  students: AdminTaskStudentRow[];
};

export type AdminTaskProgressDetail = Omit<AdminTaskDetail, "students"> & {
  students: AdminTaskProgressStudentRow[];
};

export type StudentTaskDayVideo = {
  videoId: string;
  title: string;
  isCompleted: boolean;
  completedAt: string | null;
};

export type StudentTaskView = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  className: string;
  phase: "upcoming" | "active" | "ended";
  days: { dayIndex: number; videos: StudentTaskDayVideo[] }[];
  completedCount: number;
  totalVideos: number;
  completionRate: number;
};

function todayYmd(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function taskDayIndex(startYmd: string, todayYmd: string): number {
  const a = new Date(`${startYmd}T12:00:00`);
  const b = new Date(`${todayYmd}T12:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return diff + 1;
}

function taskPhase(
  startYmd: string,
  endYmd: string,
  todayYmd: string,
): "upcoming" | "active" | "ended" {
  if (todayYmd < startYmd) return "upcoming";
  if (todayYmd > endYmd) return "ended";
  return "active";
}

function taskRowIsActive(t: LearningTaskRow): boolean {
  return (t as { is_active?: boolean }).is_active !== false;
}

function isStudentBehind(
  taskStart: string,
  taskEnd: string,
  today: string,
  taskVideos: { videoId: string; dayIndex: number }[],
  completedIds: Set<string>,
): boolean {
  const total = taskVideos.length;
  if (total === 0) return false;
  const done = taskVideos.filter((tv) => completedIds.has(tv.videoId)).length;
  if (done >= total) return false;

  if (today > taskEnd) return true;

  if (today < taskStart) return false;

  const dayNum = taskDayIndex(taskStart, today);
  return taskVideos.some(
    (tv) => tv.dayIndex <= dayNum && !completedIds.has(tv.videoId),
  );
}

function progressStatusLabel(
  startDate: string,
  endDate: string,
  today: string,
  completionRate: number,
): AdminTaskProgressStudentRow["statusLabel"] {
  if (completionRate >= 100) return "已完成";
  if (today < startDate) return "尚未開始";
  if (today > endDate) return "逾期未完成";
  return "進行中";
}

export class LearningTaskService {
  constructor(
    private readonly taskRepo: LearningTaskRepository,
    private readonly taskProgressRepo: StudentTaskProgressRepository,
    private readonly students: StudentRepository,
    private readonly videos: VideoRepository,
  ) {}

  private async resolveStudentsForTask(task: LearningTaskRow): Promise<Student[]> {
    const assignees = await this.taskRepo.findAssigneeStudentIds(task.id);
    if (assignees.length > 0) {
      const out: Student[] = [];
      for (const id of assignees) {
        const s = await this.students.findById(id);
        if (s?.isActiveStudent()) out.push(s);
      }
      return out.sort((a, b) => a.studentCode.localeCompare(b.studentCode, "zh-Hant"));
    }
    return this.students.findByClassName(task.class_name);
  }

  private async enrichTaskVideosMeta(
    videosBase: { videoId: string; dayIndex: number; title: string }[],
  ): Promise<AdminTaskVideoRow[]> {
    if (videosBase.length === 0) return [];
    const supabase = getSupabaseAdmin();
    const ids = videosBase.map((v) => v.videoId);
    const { data: vrows } = await supabase.from("videos").select("id, unit_id").in("id", ids);
    const unitByVideo = new Map<string, string>();
    const unitIds = new Set<string>();
    for (const r of vrows ?? []) {
      const row = r as { id: string; unit_id: string };
      unitByVideo.set(row.id, row.unit_id);
      unitIds.add(row.unit_id);
    }
    const unitTitleById = new Map<string, string>();
    if (unitIds.size > 0) {
      const { data: units } = await supabase
        .from("scope_units")
        .select("id, unit_title")
        .in("id", [...unitIds]);
      for (const u of units ?? []) {
        const row = u as { id: string; unit_title: string };
        unitTitleById.set(row.id, row.unit_title);
      }
    }
    const { data: tags } = await supabase
      .from("video_skill_tags")
      .select("video_id, skill_code")
      .in("video_id", ids);
    const skillsByVideo = new Map<string, string[]>();
    for (const t of tags ?? []) {
      const row = t as { video_id: string; skill_code: string };
      const list = skillsByVideo.get(row.video_id) ?? [];
      if (!list.includes(row.skill_code)) list.push(row.skill_code);
      skillsByVideo.set(row.video_id, list);
    }
    const { data: qz } = await supabase.from("quizzes").select("video_id").in("video_id", ids);
    const hasQuizSet = new Set((qz ?? []).map((q: { video_id: string }) => q.video_id));

    return videosBase.map((vb) => {
      const uid = unitByVideo.get(vb.videoId);
      return {
        ...vb,
        unitTitle: uid ? unitTitleById.get(uid) ?? "—" : "—",
        skillCodes: skillsByVideo.get(vb.videoId) ?? [],
        hasQuiz: hasQuizSet.has(vb.videoId),
      };
    });
  }

  async syncOnVideoCompleted(
    studentId: string,
    videoId: string,
    completedAt: Date | null,
  ): Promise<void> {
    const student = await this.students.findById(studentId);
    if (!student) return;

    const links = await this.taskRepo.findLinksByVideoId(videoId);
    const at = (completedAt ?? new Date()).toISOString();

    for (const { taskId } of links) {
      const task = await this.taskRepo.findById(taskId);
      if (!task || !taskRowIsActive(task)) continue;

      const assignees = await this.taskRepo.findAssigneeStudentIds(taskId);
      if (assignees.length > 0) {
        if (!assignees.includes(studentId)) continue;
      } else if (!student.className || task.class_name !== student.className) {
        continue;
      }

      await this.taskProgressRepo.upsert({
        student_id: studentId,
        task_id: taskId,
        video_id: videoId,
        is_completed: true,
        completed_at: at,
      });
    }
  }

  async updateTask(taskId: string, input: CreateLearningTaskInput): Promise<void> {
    if (input.videos.length === 0) {
      throw new Error("至少需要一支影片");
    }
    const task = await this.taskRepo.findById(taskId);
    if (!task) throw new Error("找不到任務");

    await this.taskRepo.updateTask(taskId, {
      title: input.title,
      description: input.description,
      start_date: input.startDate,
      end_date: input.endDate,
      class_name: input.className,
      is_active: input.isActive,
    });

    await this.taskRepo.deleteTaskVideosForTask(taskId);
    const rows: TaskVideoInsert[] = input.videos.map((v) => ({
      task_id: taskId,
      video_id: v.videoId,
      day_index: v.dayIndex,
    }));
    await this.taskRepo.insertTaskVideos(rows);

    const ids = input.assignmentMode === "students" ? input.studentIds : [];
    await this.taskRepo.replaceAssignees(taskId, ids);
  }

  async createTask(input: CreateLearningTaskInput): Promise<{ id: string }> {
    if (input.videos.length === 0) {
      throw new Error("至少需要一支影片");
    }
    if (input.assignmentMode === "students" && input.studentIds.length === 0) {
      throw new Error("請至少選擇一位學生");
    }
    const { id } = await this.taskRepo.insertTask({
      title: input.title,
      description: input.description,
      start_date: input.startDate,
      end_date: input.endDate,
      class_name: input.className,
      is_active: input.isActive,
    });

    const rows: TaskVideoInsert[] = input.videos.map((v) => ({
      task_id: id,
      video_id: v.videoId,
      day_index: v.dayIndex,
    }));
    await this.taskRepo.insertTaskVideos(rows);

    if (input.assignmentMode === "students" && input.studentIds.length > 0) {
      await this.taskRepo.replaceAssignees(id, input.studentIds);
    }

    return { id };
  }

  private async taskAggregateCompletionRate(taskId: string): Promise<number> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return 0;
    const tvs = await this.taskRepo.findTaskVideos(taskId);
    const totalVideos = tvs.length;
    if (totalVideos === 0) return 0;

    const classStudents = await this.resolveStudentsForTask(task);
    if (classStudents.length === 0) return 0;

    const progressRows = await this.taskProgressRepo.listByTaskId(taskId);
    const byStudent = new Map<string, Set<string>>();
    for (const p of progressRows) {
      if (!p.is_completed) continue;
      if (!byStudent.has(p.student_id)) byStudent.set(p.student_id, new Set());
      byStudent.get(p.student_id)!.add(p.video_id);
    }

    const tvMeta = tvs.map((tv) => ({ videoId: tv.video_id }));
    let sum = 0;
    for (const s of classStudents) {
      const completedIds = byStudent.get(s.id) ?? new Set<string>();
      const completedCount = tvMeta.filter((tv) => completedIds.has(tv.videoId)).length;
      const completionRate =
        totalVideos > 0 ? Math.round((completedCount / totalVideos) * 1000) / 10 : 0;
      sum += completionRate;
    }
    return Math.round((sum / classStudents.length) * 10) / 10;
  }

  async listTasks(): Promise<LearningTaskListItem[]> {
    const tasks = await this.taskRepo.findAll();
    const out: LearningTaskListItem[] = [];
    const today = todayYmd();
    for (const t of tasks) {
      const tvs = await this.taskRepo.findTaskVideos(t.id);
      const aggregateCompletionRate = await this.taskAggregateCompletionRate(t.id);
      const assignees = await this.taskRepo.findAssigneeStudentIds(t.id);
      const assigneeDisplay =
        assignees.length > 0 ? `已選 ${assignees.length} 位學生` : `${t.class_name} 班`;
      out.push({
        id: t.id,
        title: t.title,
        description: t.description,
        startDate: t.start_date,
        endDate: t.end_date,
        className: t.class_name,
        assigneeDisplay,
        videoCount: tvs.length,
        aggregateCompletionRate,
        phase: taskPhase(t.start_date, t.end_date, today),
        isActive: taskRowIsActive(t),
      });
    }
    return out;
  }

  async getAdminTaskDetail(taskId: string): Promise<AdminTaskDetail | null> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) return null;

    const assigneeStudentIds = await this.taskRepo.findAssigneeStudentIds(taskId);
    const assignmentMode: "class" | "students" = assigneeStudentIds.length > 0 ? "students" : "class";

    const tvs = await this.taskRepo.findTaskVideos(taskId);
    const videosBase: { videoId: string; dayIndex: number; title: string }[] = [];
    for (const tv of tvs) {
      const v = await this.videos.findById(tv.video_id);
      videosBase.push({
        videoId: tv.video_id,
        dayIndex: tv.day_index,
        title: v?.title ?? "(已刪除的影片)",
      });
    }
    const videos = await this.enrichTaskVideosMeta(videosBase);

    const classStudents = await this.resolveStudentsForTask(task);
    const progressRows = await this.taskProgressRepo.listByTaskId(taskId);
    const byStudent = new Map<string, Set<string>>();
    for (const p of progressRows) {
      if (!p.is_completed) continue;
      if (!byStudent.has(p.student_id)) byStudent.set(p.student_id, new Set());
      byStudent.get(p.student_id)!.add(p.video_id);
    }

    const totalVideos = tvs.length;
    const tvMeta = tvs.map((tv) => ({ videoId: tv.video_id, dayIndex: tv.day_index }));
    const today = todayYmd();

    const students: AdminTaskStudentRow[] = classStudents.map((s) => {
      const completedIds = byStudent.get(s.id) ?? new Set<string>();
      const completedCount = tvMeta.filter((tv) => completedIds.has(tv.videoId)).length;
      const completionRate =
        totalVideos > 0 ? Math.round((completedCount / totalVideos) * 1000) / 10 : 0;
      const behind = isStudentBehind(
        task.start_date,
        task.end_date,
        today,
        tvMeta,
        completedIds,
      );
      return {
        studentId: s.id,
        studentCode: s.studentCode,
        name: s.name,
        completedCount,
        totalVideos,
        completionRate,
        isBehind: behind,
      };
    });

    return {
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        startDate: task.start_date,
        endDate: task.end_date,
        className: task.class_name,
        isActive: taskRowIsActive(task),
        assignmentMode,
        assigneeStudentIds,
      },
      videos,
      students,
    };
  }

  /**
   * 任務進度頁：含測驗統計、最後學習時間、狀態文案
   */
  async getAdminTaskProgressDetail(taskId: string): Promise<AdminTaskProgressDetail | null> {
    const base = await this.getAdminTaskDetail(taskId);
    if (!base) return null;

    const taskRow = await this.taskRepo.findById(taskId);
    if (!taskRow) return null;
    const resolvedStudents = await this.resolveStudentsForTask(taskRow);
    const classById = new Map(resolvedStudents.map((st) => [st.id, st.className]));

    const { task, videos: vids } = base;
    const videoIds = vids.map((v) => v.videoId);
    if (videoIds.length === 0) {
      const today = todayYmd();
      return {
        ...base,
        students: base.students.map((s) => ({
          ...s,
          className: classById.get(s.studentId) ?? base.task.className,
          quizzesPassed: 0,
          quizzesTotal: 0,
          quizSummary: "—",
          lastActivityAt: null,
          statusLabel: progressStatusLabel(task.startDate, task.endDate, today, s.completionRate),
        })),
      };
    }

    const supabase = getSupabaseAdmin();
    const { data: quizRows } = await supabase.from("quizzes").select("id, video_id").in("video_id", videoIds);
    const allQuizIds: string[] = [];
    for (const q of quizRows ?? []) {
      const row = q as { id: string; video_id: string };
      allQuizIds.push(row.id);
    }
    const quizzesTotal = new Set(allQuizIds).size;

    const studentIds = base.students.map((s) => s.studentId);
    if (studentIds.length === 0) {
      return { ...base, students: [] };
    }

    const { data: attempts } =
      allQuizIds.length > 0
        ? await supabase
            .from("student_quiz_attempts")
            .select("student_id, quiz_id, is_passed, submitted_at")
            .in("student_id", studentIds)
            .in("quiz_id", allQuizIds)
            .not("submitted_at", "is", null)
        : { data: [] };

    const bestAttemptByStudentQuiz = new Map<string, { passed: boolean; at: string }>();
    for (const a of attempts ?? []) {
      const row = a as {
        student_id: string;
        quiz_id: string;
        is_passed: boolean;
        submitted_at: string;
      };
      const key = `${row.student_id}:${row.quiz_id}`;
      const prev = bestAttemptByStudentQuiz.get(key);
      if (!prev || row.submitted_at > prev.at) {
        bestAttemptByStudentQuiz.set(key, { passed: row.is_passed, at: row.submitted_at });
      }
    }

    const { data: svpRows } = await supabase
      .from("student_video_progress")
      .select("student_id, video_id, last_viewed_at")
      .in("student_id", studentIds)
      .in("video_id", videoIds);

    const lastViewByStudent = new Map<string, string>();
    for (const r of svpRows ?? []) {
      const row = r as { student_id: string; last_viewed_at: string | null };
      if (!row.last_viewed_at) continue;
      const prev = lastViewByStudent.get(row.student_id);
      if (!prev || row.last_viewed_at > prev) lastViewByStudent.set(row.student_id, row.last_viewed_at);
    }

    const lastAttemptByStudent = new Map<string, string>();
    for (const a of attempts ?? []) {
      const row = a as { student_id: string; submitted_at: string | null };
      if (!row.submitted_at) continue;
      const prev = lastAttemptByStudent.get(row.student_id);
      if (!prev || row.submitted_at > prev) lastAttemptByStudent.set(row.student_id, row.submitted_at);
    }

    const today = todayYmd();
    const enriched: AdminTaskProgressStudentRow[] = base.students.map((s) => {
      let passed = 0;
      for (const qid of new Set(allQuizIds)) {
        const key = `${s.studentId}:${qid}`;
        if (bestAttemptByStudentQuiz.get(key)?.passed) passed += 1;
      }

      const lv = lastViewByStudent.get(s.studentId);
      const la = lastAttemptByStudent.get(s.studentId);
      let lastActivityAt: string | null = null;
      if (lv && la) lastActivityAt = lv > la ? lv : la;
      else lastActivityAt = lv ?? la ?? null;

      const statusLabel = progressStatusLabel(task.startDate, task.endDate, today, s.completionRate);

      const quizSummary =
        quizzesTotal === 0 ? "尚無測驗" : `${passed} / ${quizzesTotal} 通過`;

      return {
        ...s,
        className: classById.get(s.studentId) ?? base.task.className,
        quizzesPassed: passed,
        quizzesTotal,
        quizSummary,
        lastActivityAt,
        statusLabel,
      };
    });

    return {
      ...base,
      students: enriched,
    };
  }

  async getStudentTasks(studentId: string): Promise<StudentTaskView[]> {
    const student = await this.students.findById(studentId);
    if (!student?.className) return [];

    const all = await this.taskRepo.findAll();
    const out: StudentTaskView[] = [];
    const today = todayYmd();

    for (const task of all) {
      if (!taskRowIsActive(task)) continue;

      const assignees = await this.taskRepo.findAssigneeStudentIds(task.id);
      if (assignees.length > 0) {
        if (!assignees.includes(studentId)) continue;
      } else if (task.class_name !== student.className) {
        continue;
      }

      const tvs = await this.taskRepo.findTaskVideos(task.id);
      const progressRows = await this.taskProgressRepo.listByTaskAndStudent(task.id, studentId);
      const progressMap = new Map<string, StudentTaskProgressRow>();
      for (const p of progressRows) {
        progressMap.set(p.video_id, p);
      }

      const dayMap = new Map<number, StudentTaskDayVideo[]>();
      for (const tv of tvs) {
        const v = await this.videos.findById(tv.video_id);
        const pr = progressMap.get(tv.video_id);
        const row: StudentTaskDayVideo = {
          videoId: tv.video_id,
          title: v?.title ?? "(影片)",
          isCompleted: pr?.is_completed ?? false,
          completedAt: pr?.completed_at ?? null,
        };
        const list = dayMap.get(tv.day_index) ?? [];
        list.push(row);
        dayMap.set(tv.day_index, list);
      }

      const days = [...dayMap.keys()]
        .sort((a, b) => a - b)
        .map((dayIndex) => ({
          dayIndex,
          videos: dayMap.get(dayIndex)!,
        }));

      const totalVideos = tvs.length;
      let completedCount = 0;
      for (const tv of tvs) {
        if (progressMap.get(tv.video_id)?.is_completed) completedCount += 1;
      }
      const completionRate =
        totalVideos > 0 ? Math.round((completedCount / totalVideos) * 1000) / 10 : 0;

      out.push({
        id: task.id,
        title: task.title,
        description: task.description,
        startDate: task.start_date,
        endDate: task.end_date,
        className: task.class_name,
        phase: taskPhase(task.start_date, task.end_date, today),
        days,
        completedCount,
        totalVideos,
        completionRate,
      });
    }

    out.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    return out;
  }
}
