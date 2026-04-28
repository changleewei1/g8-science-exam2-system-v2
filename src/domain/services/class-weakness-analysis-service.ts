export type SkillAttemptStat = {
  skillCode: string;
  skillName: string;
  totalAnswers: number;
  wrongAnswers: number;
  wrongRate: number;
  wrongStudentCount: number;
  attemptedStudentCount: number;
};

export type ClassWeaknessItem = SkillAttemptStat & {
  teacherSuggestion: string;
};

function toPercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function buildTeacherSuggestion(skillName: string): string {
  return `建議下次課堂先用 1-2 題情境題複習「${skillName}」，再讓學生分組說明解題步驟，最後用短測確認是否改善。`;
}

export class ClassWeaknessAnalysisService {
  analyze(input: {
    byStudentSkill: Map<string, Map<string, { total: number; correct: number }>>;
    skillNameByCode: Map<string, string>;
    topN?: number;
  }): ClassWeaknessItem[] {
    const topN = input.topN ?? 5;
    const aggregate = new Map<
      string,
      {
        totalAnswers: number;
        wrongAnswers: number;
        wrongStudents: Set<string>;
        attemptedStudents: Set<string>;
      }
    >();

    for (const [studentId, skillMap] of input.byStudentSkill.entries()) {
      for (const [skillCode, stat] of skillMap.entries()) {
        const cur = aggregate.get(skillCode) ?? {
          totalAnswers: 0,
          wrongAnswers: 0,
          wrongStudents: new Set<string>(),
          attemptedStudents: new Set<string>(),
        };
        cur.totalAnswers += stat.total;
        cur.wrongAnswers += stat.total - stat.correct;
        cur.attemptedStudents.add(studentId);
        if (stat.correct < stat.total) cur.wrongStudents.add(studentId);
        aggregate.set(skillCode, cur);
      }
    }

    return [...aggregate.entries()]
      .map(([skillCode, stat]) => {
        const skillName = input.skillNameByCode.get(skillCode) ?? skillCode;
        const wrongRate = toPercent(stat.wrongAnswers, stat.totalAnswers);
        return {
          skillCode,
          skillName,
          totalAnswers: stat.totalAnswers,
          wrongAnswers: stat.wrongAnswers,
          wrongRate,
          wrongStudentCount: stat.wrongStudents.size,
          attemptedStudentCount: stat.attemptedStudents.size,
          teacherSuggestion: buildTeacherSuggestion(skillName),
        };
      })
      .filter((x) => x.totalAnswers > 0)
      .sort((a, b) => {
        if (b.wrongRate !== a.wrongRate) return b.wrongRate - a.wrongRate;
        return b.wrongStudentCount - a.wrongStudentCount;
      })
      .slice(0, Math.max(3, topN));
  }
}
