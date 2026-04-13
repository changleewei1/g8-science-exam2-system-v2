/**
 * 管理後台「影片測驗」JSON 批次編輯：與 PUT /api/admin/quizzes/:id/questions 題目形狀一致，
 * 並相容題庫 JSON（如 correct_choice_index）。
 */
export const VIDEO_QUIZ_JSON_MAX_QUESTIONS = 40;
export type VideoQuizQuestionFormRow = {
  questionText: string;
  questionImageUrl: string;
  referenceImageUrl: string;
  choiceA: string;
  choiceAImageUrl: string;
  choiceB: string;
  choiceBImageUrl: string;
  choiceC: string;
  choiceCImageUrl: string;
  choiceD: string;
  choiceDImageUrl: string;
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  difficulty: string;
  skillCode: string;
};

function str(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (v === undefined || v === null) continue;
    const s = String(v);
    if (s.length > 0) return s;
  }
  return "";
}

function parseCorrect(raw: string, o: Record<string, unknown>): "A" | "B" | "C" | "D" {
  const a = raw.trim().toUpperCase();
  if (a === "A" || a === "B" || a === "C" || a === "D") return a;
  const idx = o.correct_choice_index;
  if (typeof idx === "number" && Number.isInteger(idx) && idx >= 0 && idx <= 3) {
    return (["A", "B", "C", "D"] as const)[idx];
  }
  return "A";
}

function normalizeOne(raw: unknown, defaultSkill: string): VideoQuizQuestionFormRow {
  if (!raw || typeof raw !== "object") {
    throw new Error("每題須為 JSON 物件");
  }
  const o = raw as Record<string, unknown>;
  return {
    questionText: str(o, "question_text", "questionText"),
    questionImageUrl: str(o, "question_image_url", "questionImageUrl"),
    referenceImageUrl: str(o, "reference_image_url", "referenceImageUrl"),
    choiceA: str(o, "choice_a", "choiceA"),
    choiceAImageUrl: str(o, "choice_a_image_url", "choiceAImageUrl"),
    choiceB: str(o, "choice_b", "choiceB"),
    choiceBImageUrl: str(o, "choice_b_image_url", "choiceBImageUrl"),
    choiceC: str(o, "choice_c", "choiceC"),
    choiceCImageUrl: str(o, "choice_c_image_url", "choiceCImageUrl"),
    choiceD: str(o, "choice_d", "choiceD"),
    choiceDImageUrl: str(o, "choice_d_image_url", "choiceDImageUrl"),
    correctAnswer: parseCorrect(str(o, "correct_answer", "correctAnswer"), o),
    explanation: str(o, "explanation"),
    difficulty: str(o, "difficulty") || "基礎",
    skillCode: str(o, "skill_code", "skillCode") || defaultSkill,
  };
}

export function parseVideoQuizBatchJson(
  text: string,
  defaultSkill: string,
): { ok: true; rows: VideoQuizQuestionFormRow[] } | { ok: false; error: string } {
  const t = text.trim();
  if (!t) {
    return { ok: false, error: "請貼上 JSON 內容" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(t) as unknown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "JSON 解析失敗";
    return { ok: false, error: msg };
  }

  let arr: unknown[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else if (parsed && typeof parsed === "object") {
    const q = (parsed as { questions?: unknown }).questions;
    if (Array.isArray(q)) {
      arr = q;
    } else {
      return { ok: false, error: "格式須為 { \"questions\": [ … ] } 或題目陣列 [ … ]" };
    }
  } else {
    return { ok: false, error: "根節點須為陣列或含 questions 的物件" };
  }

  if (arr.length < 1) {
    return { ok: false, error: "至少需要 1 題" };
  }
  if (arr.length > VIDEO_QUIZ_JSON_MAX_QUESTIONS) {
    return {
      ok: false,
      error: `最多 ${VIDEO_QUIZ_JSON_MAX_QUESTIONS} 題，目前為 ${arr.length} 題`,
    };
  }

  try {
    const rows = arr.map((item) => normalizeOne(item, defaultSkill));
    return { ok: true, rows };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "題目格式錯誤";
    return { ok: false, error: msg };
  }
}

/** 與 API PUT body 相同，方便複製到檔案或再貼回 */
export function videoQuizRowsToExportJson(rows: VideoQuizQuestionFormRow[]): string {
  const questions = rows.map((r) => ({
    question_text: r.questionText,
    question_image_url: r.questionImageUrl,
    reference_image_url: r.referenceImageUrl,
    choice_a: r.choiceA,
    choice_a_image_url: r.choiceAImageUrl,
    choice_b: r.choiceB,
    choice_b_image_url: r.choiceBImageUrl,
    choice_c: r.choiceC,
    choice_c_image_url: r.choiceCImageUrl,
    choice_d: r.choiceD,
    choice_d_image_url: r.choiceDImageUrl,
    correct_answer: r.correctAnswer,
    explanation: r.explanation.trim() || null,
    difficulty: r.difficulty.trim() || null,
    skill_code: r.skillCode.trim(),
  }));
  return JSON.stringify({ questions }, null, 2);
}
