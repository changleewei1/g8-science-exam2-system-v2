import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { normalizeCategory, resolveSkillName } from "@/lib/student-skill-tree";

/** 與本功能顯示一致（僅依智慧練習紀錄） */
export type SkillPracticeStatus = "尚未開始" | "練習中" | "建議加強" | "已精熟";

export function statusFromPractice(mastery: number, answerCount: number): SkillPracticeStatus {
  if (answerCount === 0) return "尚未開始";
  if (mastery >= 90) return "已精熟";
  if (mastery >= 70) return "練習中";
  return "建議加強";
}

export type SkillDef = {
  skill_code: string;
  skill_name: string;
  category: string;
  unit_id: string;
  unit_name: string;
  unit_sort_order: number;
  bank_question_count: number;
};

export type StudentSkillPracticeRow = SkillDef & {
  mastery_score: number;
  answered_count: number;
  correct_count: number;
  time_spent_label: string;
  last_practice_at: string | null;
  status: SkillPracticeStatus;
};

async function loadScopeSkillDefs(scopeId: string): Promise<{ scopeTitle: string; skills: SkillDef[] } | null> {
  const supabase = getSupabaseAdmin();
  const { data: scope, error: se } = await supabase.from("exam_scopes").select("id, title").eq("id", scopeId).maybeSingle();
  if (se || !scope) return null;

  const { data: units, error: ue } = await supabase
    .from("scope_units")
    .select("id, unit_title, sort_order")
    .eq("exam_scope_id", scopeId)
    .order("sort_order", { ascending: true });
  if (ue) throw new Error(ue.message);
  const unitRows = units ?? [];
  if (unitRows.length === 0) return { scopeTitle: scope.title as string, skills: [] };

  const unitNameSet = new Set(unitRows.map((u) => u.unit_title));
  const unitByName = new Map(unitRows.map((u) => [u.unit_title as string, u]));
  const unitIdByName = new Map(unitRows.map((u) => [u.unit_title as string, u.id as string]));
  const unitOrderById = new Map(
    unitRows.map((u) => [u.id as string, typeof u.sort_order === "number" ? u.sort_order : 0]),
  );

  const { data: tagRows, error: te } = await supabase
    .from("skill_tags")
    .select("code, name, category, unit")
    .in("unit", Array.from(unitNameSet));
  if (te) throw new Error(te.message);

  const { data: bankRows, error: be } = await supabase
    .from("question_bank_items")
    .select("unit, skill_code")
    .in("unit", Array.from(unitNameSet));
  if (be) throw new Error(be.message);

  const tagByCode = new Map(
    (tagRows ?? []).map((t) => [
      t.code as string,
      {
        name: (t.name ?? "").trim(),
        category: t.category as string | null,
        unit: t.unit as string,
      },
    ]),
  );

  const skillUnitMap = new Map<string, { unit_title: string }>();
  (tagRows ?? []).forEach((t) => {
    if (!skillUnitMap.has(t.code as string)) {
      const un = unitByName.get(t.unit as string);
      if (un) skillUnitMap.set(t.code as string, { unit_title: un.unit_title as string });
    }
  });
  (bankRows ?? []).forEach((b) => {
    const code = b.skill_code as string;
    if (skillUnitMap.has(code)) return;
    const un = unitByName.get(b.unit as string);
    if (un) skillUnitMap.set(code, { unit_title: un.unit_title as string });
  });

  const bankCountBySkill = new Map<string, number>();
  (bankRows ?? []).forEach((b) => {
    const c = b.skill_code as string;
    bankCountBySkill.set(c, (bankCountBySkill.get(c) ?? 0) + 1);
  });

  const skillCodes = Array.from(
    new Set([...(tagRows ?? []).map((t) => t.code as string), ...(bankRows ?? []).map((b) => b.skill_code as string)]),
  );

  const videoSkillNameByCode = new Map<string, string>();
  if (skillCodes.length > 0) {
    const { data: vstRows, error: vstErr } = await supabase
      .from("video_skill_tags")
      .select("skill_code, skill_name")
      .in("skill_code", skillCodes);
    if (vstErr && !vstErr.message.includes("does not exist")) throw new Error(vstErr.message);
    (vstRows ?? []).forEach((r) => {
      const c = r.skill_code as string;
      const n = (r.skill_name as string | null)?.trim() ?? "";
      if (!n || n === c || videoSkillNameByCode.has(c)) return;
      videoSkillNameByCode.set(c, n);
    });
  }

  const skills: SkillDef[] = [];
  for (const code of skillCodes.sort()) {
    const map = skillUnitMap.get(code);
    if (!map) continue;
    const uid = unitIdByName.get(map.unit_title);
    if (!uid) continue;
    const tag = tagByCode.get(code);
    skills.push({
      skill_code: code,
      skill_name: resolveSkillName(code, {
        name: tag?.name,
        skill_name: videoSkillNameByCode.get(code),
      }),
      category: normalizeCategory(tag?.category),
      unit_id: uid,
      unit_name: map.unit_title,
      unit_sort_order: unitOrderById.get(uid) ?? 0,
      bank_question_count: bankCountBySkill.get(code) ?? 0,
    });
  }

  return { scopeTitle: scope.title as string, skills };
}

type SessionLite = {
  skill_code: string;
  score: number;
  created_at: string;
  updated_at?: string;
  id?: string;
};

function pickLatestSessions(rows: SessionLite[]): Map<string, SessionLite> {
  const m = new Map<string, SessionLite>();
  const sorted = rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  sorted.forEach((r) => {
    if (!m.has(r.skill_code)) m.set(r.skill_code, r);
  });
  return m;
}

export async function getStudentSkillPracticeRows(
  studentId: string,
  scopeId: string,
): Promise<{ scope: { id: string; title: string }; units: Array<{ unit_id: string; unit_name: string; skills: StudentSkillPracticeRow[] }> } | null> {
  const base = await loadScopeSkillDefs(scopeId);
  if (!base) return null;
  const skillCodes = base.skills.map((s) => s.skill_code);
  if (skillCodes.length === 0) {
    return {
      scope: { id: scopeId, title: base.scopeTitle },
      units: [],
    };
  }

  const supabase = getSupabaseAdmin();
  const { data: sessions, error: sErr } = await supabase
    .from("adaptive_practice_sessions")
    .select("id, skill_code, score, created_at, updated_at")
    .eq("student_id", studentId)
    .in("skill_code", skillCodes)
    .order("created_at", { ascending: false });

  if (sErr && !sErr.message.includes("does not exist")) throw new Error(sErr.message);
  const sessionRows = (sessions ?? []) as Array<
    SessionLite & { id: string; student_id?: string; skill_code: string }
  >;
  const latestBySkill = pickLatestSessions(sessionRows);

  const sessionIds = sessionRows.map((r) => r.id).filter(Boolean);
  let answers: Array<{ session_id: string; is_correct: boolean; created_at: string }> = [];
  if (sessionIds.length > 0) {
    const { data: ans, error: aErr } = await supabase
      .from("adaptive_practice_answers")
      .select("session_id, is_correct, created_at")
      .in("session_id", sessionIds)
      .limit(20000);
    if (aErr && !aErr.message.includes("does not exist")) throw new Error(aErr.message);
    answers = (ans ?? []) as typeof answers;
  }

  const sessionSkillById = new Map(sessionRows.map((s) => [s.id, s.skill_code as string]));

  const answeredBySkill = new Map<string, number>();
  const correctBySkill = new Map<string, number>();
  const lastAnswerAtBySkill = new Map<string, string>();

  answers.forEach((a) => {
    const sc = sessionSkillById.get(a.session_id);
    if (!sc) return;
    answeredBySkill.set(sc, (answeredBySkill.get(sc) ?? 0) + 1);
    if (a.is_correct) correctBySkill.set(sc, (correctBySkill.get(sc) ?? 0) + 1);
    const prev = lastAnswerAtBySkill.get(sc);
    if (!prev || a.created_at > prev) lastAnswerAtBySkill.set(sc, a.created_at);
  });

  const rows: StudentSkillPracticeRow[] = base.skills.map((def) => {
    const latest = latestBySkill.get(def.skill_code);
    const answered = answeredBySkill.get(def.skill_code) ?? 0;
    const correct = correctBySkill.get(def.skill_code) ?? 0;
    const mastery = latest?.score ?? 0;
    const lastAns = lastAnswerAtBySkill.get(def.skill_code) ?? null;
    const lastSess = latest ? latest.updated_at ?? latest.created_at : null;
    const lastPractice =
      lastAns && lastSess ? (lastAns > lastSess ? lastAns : lastSess) : lastAns ?? lastSess;

    return {
      ...def,
      mastery_score: mastery,
      answered_count: answered,
      correct_count: correct,
      time_spent_label: "尚未統計",
      last_practice_at: lastPractice,
      status: statusFromPractice(mastery, answered),
    };
  });

  return {
    scope: { id: scopeId, title: base.scopeTitle },
    units: groupRowsToUnits(rows),
  };
}

function groupRowsToUnits(
  rows: StudentSkillPracticeRow[],
): Array<{ unit_id: string; unit_name: string; skills: StudentSkillPracticeRow[] }> {
  const byUnit = new Map<string, StudentSkillPracticeRow[]>();
  const orderHint = new Map<string, number>();
  rows.forEach((r) => {
    const arr = byUnit.get(r.unit_id) ?? [];
    arr.push(r);
    byUnit.set(r.unit_id, arr);
    const prev = orderHint.get(r.unit_id);
    const o = r.unit_sort_order;
    if (prev === undefined || o < prev) orderHint.set(r.unit_id, o);
  });
  const order = Array.from(byUnit.keys()).sort(
    (a, b) => (orderHint.get(a) ?? 0) - (orderHint.get(b) ?? 0) || a.localeCompare(b),
  );
  const nameById = new Map(rows.map((r) => [r.unit_id, r.unit_name]));

  return order.map((uid) => ({
    unit_id: uid,
    unit_name: nameById.get(uid) ?? "",
    skills: (byUnit.get(uid) ?? []).sort((a, b) => a.skill_code.localeCompare(b.skill_code)),
  }));
}

export type AdminSkillAggregate = {
  skill_code: string;
  skill_name: string;
  unit_id: string;
  unit_name: string;
  category: string;
  bank_question_count: number;
  practiced_student_count: number;
  mastered_student_count: number;
  need_help_student_count: number;
  avg_mastery: number;
  avg_accuracy: number | null;
};

export type AdminStudentAggregate = {
  student_id: string;
  student_name: string;
  class_name: string | null;
  practiced_skill_count: number;
  mastered_skill_count: number;
  avg_mastery: number;
  weak_top3: Array<{ skill_code: string; skill_name: string; mastery_score: number }>;
};

export type AdminClassOverview = {
  avg_mastery: number;
  mastered_skill_slots: number;
  need_help_skill_slots: number;
  not_started_student_count: number;
  student_count: number;
};

export type AdminPracticeOverview = {
  scope: { id: string; title: string };
  class: AdminClassOverview;
  by_skill: AdminSkillAggregate[];
  by_student: AdminStudentAggregate[];
};

/** 技能別列（全班聚合）的狀態：依平均熟練度與是否有學生練習過 */
export function skillAggregateStatus(row: AdminSkillAggregate): SkillPracticeStatus {
  if (row.practiced_student_count === 0) return "尚未開始";
  if (row.avg_mastery >= 90) return "已精熟";
  if (row.avg_mastery >= 70) return "練習中";
  return "建議加強";
}

/** 學生別列（該生在本次 scope 的整體）狀態 */
export function studentAggregateStatus(row: AdminStudentAggregate): SkillPracticeStatus {
  if (row.practiced_skill_count === 0) return "尚未開始";
  if (row.avg_mastery >= 90) return "已精熟";
  if (row.avg_mastery >= 70) return "練習中";
  return "建議加強";
}

export async function getAdminSkillPracticeOverview(
  scopeId: string,
  opts: {
    className?: string | null;
    unitId?: string | null;
    unitIds?: string[] | null;
    studentQ?: string | null;
    skillQ?: string | null;
    statusFilter?: SkillPracticeStatus | "" | null;
  } = {},
): Promise<AdminPracticeOverview | null> {
  const base = await loadScopeSkillDefs(scopeId);
  if (!base) return null;

  let defs = base.skills;
  if (opts.unitIds && opts.unitIds.length > 0) {
    const allow = new Set(opts.unitIds);
    defs = defs.filter((d) => allow.has(d.unit_id));
  } else if (opts.unitId) {
    defs = defs.filter((d) => d.unit_id === opts.unitId);
  }
  const sq = (opts.skillQ ?? "").trim().toLowerCase();
  if (sq) {
    defs = defs.filter(
      (d) => d.skill_code.toLowerCase().includes(sq) || d.skill_name.toLowerCase().includes(sq),
    );
  }

  defs = defs
    .slice()
    .sort((a, b) => a.unit_sort_order - b.unit_sort_order || a.skill_code.localeCompare(b.skill_code));
  const skillCodes = defs.map((d) => d.skill_code);
  const supabase = getSupabaseAdmin();

  const { data: allStudents, error: stErr } = await supabase
    .from("students")
    .select("id, name, class_name, is_active")
    .eq("is_active", true)
    .limit(5000);
  if (stErr) throw new Error(stErr.message);

  let students = (allStudents ?? []) as Array<{ id: string; name: string; class_name: string | null }>;
  const cn = (opts.className ?? "").trim();
  if (cn) students = students.filter((s) => (s.class_name ?? "").trim() === cn);
  const nq = (opts.studentQ ?? "").trim().toLowerCase();
  if (nq) students = students.filter((s) => (s.name ?? "").toLowerCase().includes(nq));

  const studentIds = students.map((s) => s.id);
  if (studentIds.length === 0 || skillCodes.length === 0) {
    return {
      scope: { id: scopeId, title: base.scopeTitle },
      class: {
        avg_mastery: 0,
        mastered_skill_slots: 0,
        need_help_skill_slots: 0,
        not_started_student_count: students.length,
        student_count: students.length,
      },
      by_skill: [],
      by_student: [],
    };
  }

  const { data: sessions, error: sessErr } = await supabase
    .from("adaptive_practice_sessions")
    .select("id, student_id, skill_code, score, created_at")
    .in("student_id", studentIds)
    .in("skill_code", skillCodes);

  if (sessErr && !sessErr.message.includes("does not exist")) throw new Error(sessErr.message);
  const sessRows =
    (sessions ?? []) as Array<{ id: string; student_id: string; skill_code: string; score: number; created_at: string }>;

  const sessionIds = sessRows.map((s) => s.id);
  let answers: Array<{ session_id: string; is_correct: boolean }> = [];
  if (sessionIds.length > 0) {
    const { data: ans, error: aErr } = await supabase
      .from("adaptive_practice_answers")
      .select("session_id, is_correct")
      .in("session_id", sessionIds)
      .limit(50000);
    if (aErr && !aErr.message.includes("does not exist")) throw new Error(aErr.message);
    answers = (ans ?? []) as typeof answers;
  }

  const sessionToStudentSkill = new Map(sessRows.map((s) => [s.id, { sid: s.student_id, sc: s.skill_code }]));
  const answersByStudentSkill = new Map<string, { total: number; correct: number }>();

  answers.forEach((a) => {
    const meta = sessionToStudentSkill.get(a.session_id);
    if (!meta) return;
    const key = `${meta.sid}::${meta.sc}`;
    const cur = answersByStudentSkill.get(key) ?? { total: 0, correct: 0 };
    cur.total += 1;
    if (a.is_correct) cur.correct += 1;
    answersByStudentSkill.set(key, cur);
  });

  const latestSession = new Map<string, { score: number }>();
  const sessSorted = sessRows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at));
  sessSorted.forEach((s) => {
    const k = `${s.student_id}::${s.skill_code}`;
    if (!latestSession.has(k)) latestSession.set(k, { score: s.score });
  });

  const defByCode = new Map(defs.map((d) => [d.skill_code, d]));

  const bySkill: AdminSkillAggregate[] = skillCodes.map((code) => {
    const def = defByCode.get(code)!;
    let practiced = 0;
    let mastered = 0;
    let needHelp = 0;
    let sumM = 0;
    let sumCorr = 0;
    let sumTot = 0;

    students.forEach((st) => {
      const key = `${st.id}::${code}`;
      const ans = answersByStudentSkill.get(key);
      const latest = latestSession.get(key);
      const answered = ans?.total ?? 0;
      const mastery = latest?.score ?? 0;
      if (answered === 0 && !latest) return;
      practiced += 1;
      sumM += mastery;
      if (answered > 0) {
        sumCorr += ans?.correct ?? 0;
        sumTot += answered;
      }
      const stLabel = statusFromPractice(mastery, answered);
      if (stLabel === "已精熟") mastered += 1;
      if (stLabel === "建議加強") needHelp += 1;
    });

    return {
      skill_code: code,
      skill_name: def.skill_name,
      unit_id: def.unit_id,
      unit_name: def.unit_name,
      category: def.category,
      bank_question_count: def.bank_question_count,
      practiced_student_count: practiced,
      mastered_student_count: mastered,
      need_help_student_count: needHelp,
      avg_mastery: practiced ? Math.round(sumM / practiced) : 0,
      avg_accuracy: sumTot > 0 ? Math.round((sumCorr / sumTot) * 1000) / 1000 : null,
    };
  });

  const stf = opts.statusFilter;
  let filteredSkills = bySkill;
  if (stf) {
    filteredSkills = bySkill.filter((row) => skillAggregateStatus(row) === stf);
  }

  let by_student: AdminStudentAggregate[] = students.map((st) => {
    const skillStats: Array<{ code: string; name: string; mastery: number; answered: number }> = [];
    let sum = 0;
    let n = 0;
    let masteredN = 0;
    skillCodes.forEach((code) => {
      const key = `${st.id}::${code}`;
      const ans = answersByStudentSkill.get(key);
      const latest = latestSession.get(key);
      const answered = ans?.total ?? 0;
      const mastery = latest?.score ?? 0;
      const def = defByCode.get(code)!;
      if (answered > 0 || latest) {
        skillStats.push({ code, name: def.skill_name, mastery, answered });
        sum += mastery;
        n += 1;
        if (statusFromPractice(mastery, answered) === "已精熟") masteredN += 1;
      }
    });

    const avg_mastery = n ? Math.round(sum / n) : 0;
    const weak = skillStats
      .filter((s) => s.answered > 0 && statusFromPractice(s.mastery, s.answered) === "建議加強")
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 3)
      .map((s) => ({ skill_code: s.code, skill_name: s.name, mastery_score: s.mastery }));

    return {
      student_id: st.id,
      student_name: st.name,
      class_name: st.class_name,
      practiced_skill_count: n,
      mastered_skill_count: masteredN,
      avg_mastery,
      weak_top3: weak,
    };
  });

  if (stf) {
    by_student = by_student.filter((row) => studentAggregateStatus(row) === stf);
  }

  let sumAllMastery = 0;
  let slotN = 0;
  let masteredSlots = 0;
  let needHelpSlots = 0;
  students.forEach((st) => {
    skillCodes.forEach((code) => {
      const key = `${st.id}::${code}`;
      const ans = answersByStudentSkill.get(key);
      const latest = latestSession.get(key);
      const answered = ans?.total ?? 0;
      const mastery = latest?.score ?? 0;
      if (answered === 0 && !latest) return;
      slotN += 1;
      sumAllMastery += mastery;
      const stl = statusFromPractice(mastery, answered);
      if (stl === "已精熟") masteredSlots += 1;
      if (stl === "建議加強") needHelpSlots += 1;
    });
  });

  const notStartedStudents = students.filter((st) => {
    return !skillCodes.some((code) => {
      const key = `${st.id}::${code}`;
      const ans = answersByStudentSkill.get(key);
      const latest = latestSession.get(key);
      return (ans?.total ?? 0) > 0 || latest;
    });
  }).length;

  return {
    scope: { id: scopeId, title: base.scopeTitle },
    class: {
      avg_mastery: slotN ? Math.round(sumAllMastery / slotN) : 0,
      mastered_skill_slots: masteredSlots,
      need_help_skill_slots: needHelpSlots,
      not_started_student_count: notStartedStudents,
      student_count: students.length,
    },
    by_skill: filteredSkills.sort((a, b) => a.skill_code.localeCompare(b.skill_code)),
    by_student: by_student.sort((a, b) => a.student_name.localeCompare(b.student_name)),
  };
}

export async function getStudentSkillPracticeDetailForAdmin(
  studentId: string,
  scopeId: string,
): Promise<{
  student: { id: string; name: string; class_name: string | null };
  scope: { id: string; title: string };
  skills: StudentSkillPracticeRow[];
} | null> {
  const supabase = getSupabaseAdmin();
  const { data: stu, error: e1 } = await supabase
    .from("students")
    .select("id, name, class_name")
    .eq("id", studentId)
    .maybeSingle();
  if (e1 || !stu) return null;

  const tree = await getStudentSkillPracticeRows(studentId, scopeId);
  if (!tree) return null;

  const flat = tree.units.flatMap((u) => u.skills);
  return {
    student: {
      id: stu.id as string,
      name: stu.name as string,
      class_name: (stu.class_name as string | null) ?? null,
    },
    scope: tree.scope,
    skills: flat,
  };
}
