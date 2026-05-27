/** 單題四選項：隨機重排顯示順序，並維持與後端（原始 A–D 欄位）的對照。 */

export type VideoQuizChoicePerm = {
  displayToOriginal: Record<string, string>;
  originalToDisplay: Record<string, string>;
};

export type VideoQuizQuestionShape = {
  id: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
};

function identityPerm(): VideoQuizChoicePerm {
  const displayToOriginal: Record<string, string> = { A: "A", B: "B", C: "C", D: "D" };
  return {
    displayToOriginal,
    originalToDisplay: { ...displayToOriginal },
  };
}

export function shuffleChoicesForVideoQuiz<T extends VideoQuizQuestionShape>(
  q: T,
): { question: T; perm: VideoQuizChoicePerm } {
  const pairs: { orig: string; text: string }[] = [
    { orig: "A", text: q.choiceA },
    { orig: "B", text: q.choiceB },
    { orig: "C", text: q.choiceC },
    { orig: "D", text: q.choiceD },
  ];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = pairs[i];
    const b = pairs[j];
    if (a !== undefined && b !== undefined) {
      pairs[i] = b;
      pairs[j] = a;
    }
  }
  const labels = ["A", "B", "C", "D"] as const;
  const displayToOriginal: Record<string, string> = {};
  const originalToDisplay: Record<string, string> = {};
  for (let i = 0; i < 4; i++) {
    const L = labels[i];
    const cell = pairs[i];
    if (!cell) continue;
    displayToOriginal[L] = cell.orig;
    originalToDisplay[cell.orig] = L;
  }
  const p0 = pairs[0];
  const p1 = pairs[1];
  const p2 = pairs[2];
  const p3 = pairs[3];
  if (!p0 || !p1 || !p2 || !p3) {
    return { question: q, perm: identityPerm() };
  }
  return {
    question: {
      ...q,
      choiceA: p0.text,
      choiceB: p1.text,
      choiceC: p2.text,
      choiceD: p3.text,
    },
    perm: { displayToOriginal, originalToDisplay },
  };
}
