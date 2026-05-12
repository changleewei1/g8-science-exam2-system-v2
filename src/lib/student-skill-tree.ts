import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";

export type SkillStatus = "尚未開始" | "練習中" | "已達精熟" | "建議加強";

export type SkillTreeSkill = {
  skill_code: string;
  skill_name: string;
  category: string;
  difficulty: string;
  domain: string;
  question_count: number;
  mastery_score: number;
  status: SkillStatus;
};

export type SkillTreeUnit = {
  unit_id: string;
  unit_name: string;
  skills: SkillTreeSkill[];
};

export type StudentSkillTreeData = {
  scope: { id: string; title: string };
  units: SkillTreeUnit[];
};

export const SKILL_NAME_MAP: Record<string, string> = {
  EL01: "電解質的基本概念",
  EL02: "電解質與非電解質判斷",
  EL03: "電解質導電原理",
  EL04: "電解質的實驗判斷",
  EL05: "強電解質與弱電解質",
  EL06: "電解質的生活應用",
  AB01: "酸的基本性質",
  AB02: "鹼的基本性質",
  AB03: "酸的生活應用與辨識",
  AB04: "鹼的生活應用與辨識",
  AB05: "pH值與酸鹼判斷",
  AB06: "酸鹼安全與操作",
  CO01: "濃度的基本概念",
  CO02: "濃度比較與判斷",
  CO03: "濃度的定性判斷",
  CO04: "稀釋與濃度變化",
  CO05: "濃度的生活應用",
  NE01: "中和反應基本概念",
  NE02: "中和後溶液性質",
  NE03: "中和反應判斷",
  NE04: "中和與滴定概念",
  NE05: "中和的生活應用",
  RS01: "反應速率的意義",
  RS02: "影響反應速率的因素",
  RS03: "溫度對反應速率的影響",
  RS04: "濃度對反應速率的影響",
  RS05: "比較反應快慢",
  RS06: "控制變因的判斷",
  RS07: "生活中的反應速率",
  RS08: "反應速率的定量比較",
  RS09: "平均反應速率計算",
  RS10: "反應速率圖表判讀",
  RS11: "條件改變下的速率比較",
};

function scoreToStatus(score: number, hasAnyAnswer: boolean): SkillStatus {
  if (!hasAnyAnswer) return "尚未開始";
  if (score >= 90) return "已達精熟";
  if (score >= 70) return "練習中";
  return "建議加強";
}

export function normalizeCategory(raw: string | null | undefined): string {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "concept") return "Concept";
  if (v === "procedure") return "Procedure";
  if (v === "application") return "Application";
  return "Concept";
}

function pickDifficulty(fromTag: string | null | undefined, fromBank: string[]): string {
  if (fromTag?.trim()) return fromTag;
  const set = new Set(fromBank);
  if (set.has("高階")) return "高階";
  if (set.has("進階")) return "進階";
  if (set.has("基礎")) return "基礎";
  return "基礎";
}

export function resolveSkillName(code: string, name: string | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed || trimmed === code) return SKILL_NAME_MAP[code] ?? code;
  return trimmed;
}

export async function getStudentSkillTreeData(
  studentId: string,
  scopeId: string,
): Promise<StudentSkillTreeData | null> {
  const supabase = getSupabaseAdmin();

  const { data: scope, error: scopeErr } = await supabase
    .from("exam_scopes")
    .select("id, title")
    .eq("id", scopeId)
    .maybeSingle();
  if (scopeErr) throw new Error(scopeErr.message);
  if (!scope) return null;

  const { data: units, error: unitErr } = await supabase
    .from("scope_units")
    .select("id, unit_title, sort_order")
    .eq("exam_scope_id", scopeId)
    .order("sort_order", { ascending: true });
  if (unitErr) throw new Error(unitErr.message);

  const unitRows = units ?? [];
  if (unitRows.length === 0) {
    return { scope: { id: scope.id, title: scope.title }, units: [] };
  }

  const unitNameSet = new Set(unitRows.map((u) => u.unit_title));

  const { data: tagRows, error: tagErr } = await supabase
    .from("skill_tags")
    .select("code, name, category, difficulty, domain, unit")
    .in("unit", Array.from(unitNameSet));
  if (tagErr) throw new Error(tagErr.message);

  const { data: bankRows, error: bankErr } = await supabase
    .from("question_bank_items")
    .select("id, unit, skill_code, difficulty")
    .in("unit", Array.from(unitNameSet));
  if (bankErr) throw new Error(bankErr.message);

  const tagByCode = new Map(
    (tagRows ?? []).map((t) => [
      t.code,
      {
        name: (t.name ?? "").trim(),
        category: t.category as string | null,
        difficulty: t.difficulty as string | null,
        domain: (t.domain as string | null) ?? "chemistry",
        unit: t.unit,
      },
    ]),
  );

  const skillUnitMap = new Map<string, string>();
  (tagRows ?? []).forEach((t) => {
    if (!skillUnitMap.has(t.code)) skillUnitMap.set(t.code, t.unit);
  });
  (bankRows ?? []).forEach((b) => {
    if (!skillUnitMap.has(b.skill_code)) skillUnitMap.set(b.skill_code, b.unit);
  });

  const bankBySkill = new Map<string, { count: number; difficulties: string[] }>();
  (bankRows ?? []).forEach((b) => {
    const cur = bankBySkill.get(b.skill_code) ?? { count: 0, difficulties: [] };
    cur.count += 1;
    cur.difficulties.push(b.difficulty);
    bankBySkill.set(b.skill_code, cur);
  });

  const skillCodes = Array.from(
    new Set([
      ...(tagRows ?? []).map((t) => t.code),
      ...(bankRows ?? []).map((b) => b.skill_code),
    ]),
  );

  const adaptiveScoreBySkill = new Map<string, number>();
  if (skillCodes.length > 0) {
    const { data: sessionRows, error: sessionErr } = await supabase
      .from("adaptive_practice_sessions")
      .select("skill_code, score, created_at")
      .eq("student_id", studentId)
      .in("skill_code", skillCodes)
      .order("created_at", { ascending: false });
    if (sessionErr && !sessionErr.message.includes("does not exist")) throw new Error(sessionErr.message);
    (sessionRows ?? []).forEach((r) => {
      if (!adaptiveScoreBySkill.has(r.skill_code)) adaptiveScoreBySkill.set(r.skill_code, r.score);
    });
  }

  const fallbackScoreBySkill = new Map<string, number>();
  const fallbackHasAnyAnswer = new Set<string>();
  const fallbackNeeded = skillCodes.filter((c) => !adaptiveScoreBySkill.has(c));
  if (fallbackNeeded.length > 0) {
    const { data: attempts, error: attemptErr } = await supabase
      .from("student_quiz_attempts")
      .select("id")
      .eq("student_id", studentId)
      .limit(5000);
    if (attemptErr) throw new Error(attemptErr.message);
    const attemptIds = (attempts ?? []).map((a) => a.id);

    if (attemptIds.length > 0) {
      const { data: answers, error: answerErr } = await supabase
        .from("student_quiz_answers")
        .select("question_id, is_correct")
        .in("attempt_id", attemptIds)
        .limit(20000);
      if (answerErr) throw new Error(answerErr.message);
      const questionIds = Array.from(new Set((answers ?? []).map((a) => a.question_id)));
      if (questionIds.length > 0) {
        const { data: qRows, error: qErr } = await supabase
          .from("quiz_questions")
          .select("id, skill_code")
          .in("id", questionIds)
          .limit(20000);
        if (qErr) throw new Error(qErr.message);

        const skillByQuestionId = new Map((qRows ?? []).map((q) => [q.id, q.skill_code]));
        const counts = new Map<string, { total: number; correct: number }>();
        (answers ?? []).forEach((a) => {
          const code = skillByQuestionId.get(a.question_id);
          if (!code || !fallbackNeeded.includes(code)) return;
          const cur = counts.get(code) ?? { total: 0, correct: 0 };
          cur.total += 1;
          if (a.is_correct) cur.correct += 1;
          counts.set(code, cur);
        });

        counts.forEach((v, code) => {
          if (v.total <= 0) return;
          fallbackHasAnyAnswer.add(code);
          fallbackScoreBySkill.set(code, Math.round((v.correct / v.total) * 100));
        });
      }
    }
  }

  const unitOutput: SkillTreeUnit[] = unitRows.map((u) => ({
    unit_id: u.id,
    unit_name: u.unit_title,
    skills: [],
  }));
  const unitIndex = new Map(unitOutput.map((u) => [u.unit_name, u]));

  skillCodes.forEach((code) => {
    const unitName = skillUnitMap.get(code);
    if (!unitName) return;
    const unit = unitIndex.get(unitName);
    if (!unit) return;
    const tag = tagByCode.get(code);
    const bankInfo = bankBySkill.get(code) ?? { count: 0, difficulties: [] };
    const adaptiveScore = adaptiveScoreBySkill.get(code);
    const fallbackScore = fallbackScoreBySkill.get(code);
    const masteryScore = adaptiveScore ?? fallbackScore ?? 0;
    const hasAnyAnswer =
      adaptiveScore !== undefined || fallbackHasAnyAnswer.has(code);

    unit.skills.push({
      skill_code: code,
      skill_name: resolveSkillName(code, tag?.name),
      category: normalizeCategory(tag?.category),
      difficulty: pickDifficulty(tag?.difficulty, bankInfo.difficulties),
      domain: tag?.domain ?? "chemistry",
      question_count: bankInfo.count,
      mastery_score: masteryScore,
      status: scoreToStatus(masteryScore, hasAnyAnswer),
    });
  });

  unitOutput.forEach((u) => {
    u.skills.sort((a, b) => a.skill_code.localeCompare(b.skill_code));
  });

  return {
    scope: { id: scope.id, title: scope.title },
    units: unitOutput,
  };
}
