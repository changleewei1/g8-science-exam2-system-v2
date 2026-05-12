/** 智慧練習：熟練度分數、難度切換、精熟判斷（純邏輯，不含 I/O） */

export type AdaptivePracticeDifficulty = "基礎" | "進階";

export type AdaptivePracticeStateInput = {
  score: number;
  streak: number;
  difficulty: AdaptivePracticeDifficulty;
  isCorrect: boolean;
};

export type AdaptivePracticeStateResult = {
  score: number;
  streak: number;
  difficulty: AdaptivePracticeDifficulty;
  isMastered: boolean;
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/**
 * 依答對與否更新分數、連續答對、難度與是否已精熟。
 * 規則與產品文件一致：答錯一律回到「基礎」；連續答對兩題（含）以上進入「進階」。
 */
export function computeStateAfterAnswer(input: AdaptivePracticeStateInput): AdaptivePracticeStateResult {
  const { isCorrect } = input;
  let score = input.score;
  let streak = input.streak;
  const difficultyBefore = input.difficulty;

  if (isCorrect) {
    score += difficultyBefore === "基礎" ? 8 : 10;
    streak += 1;
  } else {
    score -= 5;
    streak = 0;
  }

  score = clampScore(score);

  let difficulty: AdaptivePracticeDifficulty = difficultyBefore;
  if (!isCorrect) {
    difficulty = "基礎";
  } else if (streak >= 2) {
    difficulty = "進階";
  }

  const isMastered = score >= 90;

  return { score, streak, difficulty, isMastered };
}

export function normalizeMcqAnswer(raw: string): string {
  return raw.trim().toUpperCase().slice(0, 1);
}
