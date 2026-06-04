import type { ExamScope } from "@/domain/entities";
import type { ScopeUnitRepository } from "@/domain/repositories";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getStudentSkillPracticeRows } from "@/lib/skill-practice-summary";
import type {
  DashboardHeroStats,
  DashboardSummary,
  ExamCard,
  GradeDashboardBlock,
  SemesterLabel,
  StudentDashboardPayload,
  StudentFocusHomePayload,
  StudentOverviewScopeOption,
} from "@/lib/student-dashboard-types";
import { getStudentLearningService, getLearningTaskService } from "@/infrastructure/composition";
import {
  resolveFirstUnreadQuestionQuizHref,
} from "@/lib/student-question-update-notifications";

const EXAM_LABELS = ["第一次段考", "第二次段考", "第三次段考"] as const;

type SlotKey = `${number}-${number}-${number}`;

function slotKey(grade: number, term: number, examNo: number): SlotKey {
  return `${grade}-${term}-${examNo}`;
}

function termToSemester(term: number): SemesterLabel {
  return term === 1 ? "上學期" : "下學期";
}

function buildLockedCard(
  grade: number,
  term: number,
  examNo: number,
  subject: string,
): ExamCard {
  return {
    id: `locked-${grade}-${term}-${examNo}`,
    grade: grade === 8 ? "國二" : "國三",
    semester: termToSemester(term),
    exam: EXAM_LABELS[examNo - 1] ?? `第${examNo}次段考`,
    subject,
    isOpen: false,
    completionRate: 0,
    masteredSkills: 0,
    totalSkills: 0,
    averageMastery: 0,
    units: [],
  };
}

async function computeWeeklyLearning(studentId: string): Promise<{ minutes: number; label: string }> {
  const supabase = getSupabaseAdmin();
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);
  const since = weekStart.toISOString();

  const { data: videoRows } = await supabase
    .from("student_video_progress")
    .select("watch_seconds, last_viewed_at, updated_at")
    .eq("student_id", studentId)
    .gte("updated_at", since)
    .limit(5000);

  let watchSeconds = 0;
  (videoRows ?? []).forEach((r) => {
    watchSeconds += Number(r.watch_seconds ?? 0);
  });

  const { data: sessions } = await supabase
    .from("adaptive_practice_sessions")
    .select("id, created_at")
    .eq("student_id", studentId)
    .gte("created_at", since)
    .limit(2000);

  const sessionIds = (sessions ?? []).map((s) => s.id as string);
  let answerCount = 0;
  if (sessionIds.length > 0) {
    const { count } = await supabase
      .from("adaptive_practice_answers")
      .select("id", { count: "exact", head: true })
      .in("session_id", sessionIds);
    answerCount = count ?? 0;
  }

  const practiceSeconds = answerCount * 90;
  const totalMinutes = Math.round((watchSeconds + practiceSeconds) / 60);
  if (totalMinutes <= 0) return { minutes: 0, label: "本週尚未記錄" };
  if (totalMinutes < 60) return { minutes: totalMinutes, label: `${totalMinutes} 分鐘` };
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const label = mins > 0 ? `${hours} 小時 ${mins} 分` : `${hours} 小時`;
  return { minutes: totalMinutes, label };
}

async function computeWeeklyLearningLabel(studentId: string): Promise<string> {
  const { label } = await computeWeeklyLearning(studentId);
  return label;
}

async function enrichOpenCard(
  studentId: string,
  scope: ExamScope,
): Promise<
  Pick<ExamCard, "completionRate" | "masteredSkills" | "totalSkills" | "averageMastery"> & {
    videoCompletionRate: number;
    skillCompletionRate: number;
  }
> {
  const learning = getStudentLearningService();
  const [videoRate, practice] = await Promise.all([
    learning.getVideoCompletionRate(studentId, scope.id),
    getStudentSkillPracticeRows(studentId, scope.id),
  ]);

  const flat = practice?.units.flatMap((u) => u.skills) ?? [];
  const totalSkills = flat.length;
  const masteredSkills = flat.filter((s) => s.status === "已精熟").length;
  const practiced = flat.filter((s) => s.answered_count > 0);
  const averageMastery =
    practiced.length > 0
      ? Math.round(practiced.reduce((acc, s) => acc + s.mastery_score, 0) / practiced.length)
      : 0;

  const skillRate = totalSkills > 0 ? Math.round((masteredSkills / totalSkills) * 100) : 0;
  const completionRate = Math.round((videoRate + skillRate) / 2);

  return {
    completionRate,
    masteredSkills,
    totalSkills,
    averageMastery,
    videoCompletionRate: videoRate,
    skillCompletionRate: skillRate,
  };
}

function collectSpringExam2And3Options(
  springCards: ExamCard[],
  gradeShortLabel: string,
): StudentOverviewScopeOption[] {
  return springCards
    .filter((c) => c.isOpen && (c.exam === "第二次段考" || c.exam === "第三次段考"))
    .map((c) => ({
      id: c.id,
      label: `${c.semester} · ${c.exam}`,
      fullLabel: `${gradeShortLabel}理化${c.semester}${c.exam}`,
      role: c.exam === "第三次段考" ? ("current_prep" as const) : ("historical" as const),
    }));
}

/** URL ?scopeId= → 有效則採用；否則預設第三次段考，再 fallback 第二次 */
export function resolveDefaultOverviewScopeId(
  options: StudentOverviewScopeOption[],
  queryScopeId?: string | null,
): string | null {
  const q = queryScopeId?.trim();
  if (q && options.some((o) => o.id === q)) return q;
  const third = options.find((o) => o.role === "current_prep");
  if (third) return third.id;
  const second = options.find((o) => o.role === "historical");
  if (second) return second.id;
  return options[0]?.id ?? null;
}

export async function buildStudentDashboardPayload(
  studentId: string,
  studentName: string,
  studentGrade: number,
  scopes: ExamScope[],
  scopeUnits: ScopeUnitRepository,
  overviewScopeQueryId?: string | null,
): Promise<StudentDashboardPayload> {
  const scopeBySlot = new Map<SlotKey, ExamScope>();
  scopes.forEach((s) => {
    if (!s.isAvailable()) return;
    scopeBySlot.set(slotKey(s.grade, s.term, s.examNo), s);
  });

  const defaultSubject = scopes[0]?.subject ?? "自然（理化）";
  const unitCache = new Map<string, string[]>();

  async function unitsForScope(scopeId: string): Promise<string[]> {
    if (unitCache.has(scopeId)) return unitCache.get(scopeId)!;
    const rows = await scopeUnits.findByExamScopeId(scopeId);
    const titles = rows.map((u) => u.unitTitle);
    unitCache.set(scopeId, titles);
    return titles;
  }

  async function cardForSlot(grade: number, term: number, examNo: number): Promise<ExamCard> {
    const scope = scopeBySlot.get(slotKey(grade, term, examNo));
    if (!scope) {
      return buildLockedCard(grade, term, examNo, defaultSubject);
    }

    const units = await unitsForScope(scope.id);
    const stats = await enrichOpenCard(studentId, scope);
    const { videoCompletionRate: _v, skillCompletionRate: _s, ...examStats } = stats;

    return {
      id: scope.id,
      grade: grade === 8 ? "國二" : "國三",
      semester: termToSemester(term),
      exam: EXAM_LABELS[examNo - 1] ?? `第${examNo}次段考`,
      subject: scope.subject,
      isOpen: true,
      units,
      ...examStats,
    };
  }

  async function semesterCards(grade: number, term: number): Promise<ExamCard[]> {
    return Promise.all([1, 2, 3].map((examNo) => cardForSlot(grade, term, examNo)));
  }

  const [g8Fall, g8Spring, g9Fall, g9Spring, weeklyLearningLabel] = await Promise.all([
    semesterCards(8, 1),
    semesterCards(8, 2),
    semesterCards(9, 1),
    semesterCards(9, 2),
    computeWeeklyLearningLabel(studentId),
  ]);

  const allCards = [...g8Fall, ...g8Spring, ...g9Fall, ...g9Spring];
  const openCards = allCards.filter((c) => c.isOpen);

  let masteredSkills = 0;
  let masterySum = 0;
  let masteryN = 0;
  let completionSum = 0;

  openCards.forEach((c) => {
    masteredSkills += c.masteredSkills;
    if (c.averageMastery > 0 || c.masteredSkills > 0) {
      masterySum += c.averageMastery;
      masteryN += 1;
    }
    completionSum += c.completionRate;
  });

  const averageMastery = masteryN > 0 ? Math.round(masterySum / masteryN) : 0;
  const overallCompletion =
    openCards.length > 0 ? Math.round(completionSum / openCards.length) : 0;
  const totalSkills = openCards.reduce((acc, c) => acc + c.totalSkills, 0);

  const recommended =
    openCards.length > 0
      ? openCards
          .slice()
          .sort((a, b) => a.completionRate - b.completionRate || b.exam.localeCompare(a.exam))[0]
      : null;

  const summary: DashboardSummary = {
    openScopeCount: openCards.length,
    masteredSkills,
    averageMastery,
    weeklyLearningLabel,
  };

  const hero: DashboardHeroStats = {
    overallCompletion,
    masteredSkills,
    totalSkills,
    weeklyLearningLabel,
    recommendedScopeTitle: recommended
      ? `${recommended.grade}理化 · ${recommended.semester}${recommended.exam}`
      : null,
    recommendedScopeId: recommended?.id ?? null,
  };

  const grades: GradeDashboardBlock[] = [
    { gradeLabel: "國二理化 AI 學習", gradeNumber: 8, fall: g8Fall, spring: g8Spring },
    { gradeLabel: "國三理化 AI 學習", gradeNumber: 9, fall: g9Fall, spring: g9Spring },
  ];

  const myGradeBlock = grades.find((g) => g.gradeNumber === studentGrade);
  const gradeShortLabel = studentGrade === 8 ? "國二" : studentGrade === 9 ? "國三" : `國${studentGrade}`;
  const overviewScopeOptions = collectSpringExam2And3Options(myGradeBlock?.spring ?? [], gradeShortLabel);
  const defaultOverviewScopeId = resolveDefaultOverviewScopeId(overviewScopeOptions, overviewScopeQueryId);

  return { studentName, summary, hero, grades, overviewScopeOptions, defaultOverviewScopeId };
}

function pickActiveExamScopeForStudent(scopes: ExamScope[], studentGrade: number): ExamScope | null {
  const open = scopes.filter((s) => s.isAvailable());
  const forGrade = open.filter((s) => s.grade === studentGrade);
  if (forGrade.length === 0) return null;
  return [...forGrade].sort((a, b) => {
    if (a.term !== b.term) return b.term - a.term;
    return b.examNo - a.examNo;
  })[0] ?? null;
}

function scopeHeadline(scope: ExamScope): string {
  const gradeLabel = scope.grade === 8 ? "國二" : scope.grade === 9 ? "國三" : `國${scope.grade}`;
  const sem = termToSemester(scope.term);
  const exam = EXAM_LABELS[scope.examNo - 1] ?? `第${scope.examNo}次段考`;
  return `${gradeLabel}理化 · ${sem}${exam}`;
}

export async function buildStudentFocusHomePayload(
  studentId: string,
  studentName: string,
  studentGrade: number,
  scopes: ExamScope[],
): Promise<StudentFocusHomePayload> {
  const [taskSummary, weekly] = await Promise.all([
    getLearningTaskService().getStudentLearningTaskSummary(studentId),
    computeWeeklyLearning(studentId),
  ]);

  let questionUpdate: StudentFocusHomePayload["questionUpdate"];
  if (taskSummary.unreadQuestionUpdateCount > 0) {
    const practiceHref =
      (await resolveFirstUnreadQuestionQuizHref(studentId)) ?? "/student/tasks#question-updates";
    questionUpdate = {
      unreadCount: taskSummary.unreadQuestionUpdateCount,
      practiceHref,
    };
  }

  const active = pickActiveExamScopeForStudent(scopes, studentGrade);
  if (!active) {
    return {
      studentName,
      studentGrade,
      weeklyLearningLabel: weekly.label,
      weeklyLearningMinutes: weekly.minutes,
      taskSummary,
      questionUpdate,
      nextStepHint: "目前沒有對應你年級的開放段考，請聯絡老師或稍後再試。",
      activeScope: null,
    };
  }

  const learning = getStudentLearningService();
  const [stats, quizPassRate] = await Promise.all([
    enrichOpenCard(studentId, active),
    learning.getQuizPassRate(studentId, active.id),
  ]);
  const completionRate = stats.completionRate;

  let nextStepHint = "進入段考預習：依單元觀看影片並完成智慧練習。";
  if (taskSummary.hasNewTasks) {
    nextStepHint = "先完成老師指派的學習任務（新任務）。";
  } else if (taskSummary.incompleteTaskCount > 0) {
    nextStepHint = "接著處理尚未完成的學習任務。";
  } else if (completionRate >= 100) {
    nextStepHint = "段考整體進度已達標，可進入單元溫習或挑戰進階練習。";
  }

  return {
    studentName,
    studentGrade,
    weeklyLearningLabel: weekly.label,
    weeklyLearningMinutes: weekly.minutes,
    taskSummary,
    questionUpdate,
    nextStepHint,
    activeScope: {
      id: active.id,
      title: active.title,
      subject: active.subject,
      headline: scopeHeadline(active),
      completionRate,
      masteredSkills: stats.masteredSkills,
      totalSkills: stats.totalSkills,
      averageMastery: stats.averageMastery,
      videoCompletionRate: stats.videoCompletionRate,
      skillCompletionRate: stats.skillCompletionRate,
      quizPassRate,
    },
  };
}
