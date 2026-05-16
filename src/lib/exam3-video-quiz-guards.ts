import { G8_SPRING_TERM_EXAM3_SCOPE_ID } from "@/lib/exam3-scope";

/** 第三次段考匯入／回填時寫入的假題骨架（須禁止學生作答與顯示） */
export function looksLikePlaceholderQuizQuestion(q: {
  questionText: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
}): boolean {
  const t = (q.questionText ?? "").trim();
  if (t.includes("請依據本影片內容選出最適當的答案")) return true;
  if (t.includes("請依據影片內容選出最適當的答案")) return true;
  if (t.includes("請依據影片內容選出")) return true;
  const a = (q.choiceA ?? "").trim();
  const b = (q.choiceB ?? "").trim();
  const c = (q.choiceC ?? "").trim();
  const d = (q.choiceD ?? "").trim();
  if (a === "選項 A" && b === "選項 B" && c === "選項 C" && d === "選項 D") return true;
  return false;
}

export function isExam3ScopeId(examScopeId: string | null | undefined): boolean {
  return examScopeId === G8_SPRING_TERM_EXAM3_SCOPE_ID;
}

export function filterExam3VideoComprehensionQuestions<
  T extends {
    questionText: string;
    choiceA: string;
    choiceB: string;
    choiceC: string;
    choiceD: string;
    sortOrder?: number;
  },
>(examScopeId: string | null, questions: T[]): { items: T[]; incomplete: boolean } {
  if (!isExam3ScopeId(examScopeId)) {
    return { items: questions, incomplete: false };
  }
  const real = questions
    .filter((q) => !looksLikePlaceholderQuizQuestion(q))
    .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  if (real.length < 3) return { items: [], incomplete: true };
  return { items: real.slice(0, 3), incomplete: false };
}
