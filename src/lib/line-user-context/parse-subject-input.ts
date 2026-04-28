/**
 * 科目輸入正規化與解析（集中處理空白／全形空白／別名，不在 route 內字串判斷）。
 */

export type SubjectCode = "science" | "math" | "english";

export type SubjectResolution =
  | { status: "known"; code: SubjectCode; displayLabel: string }
  | { status: "unknown" };

/** 全形空白、NBSP、一般空白 → 單一半形空白，並 trim */
export function normalizeLineInput(raw: string): string {
  return raw
    .trim()
    .replace(/[\u3000\u00a0]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 與 LINE 上「小朋友學習狀況」總覽查詢比對用之標準字串（不含標點） */
export const PARENT_LEARNING_OVERVIEW_QUERY_KEY = "小朋友學習狀況";

/**
 * 是否為「小朋友學習狀況」查詢（允許尾端標點、句中多餘空白、零寬字元）。
 * 避免使用者輸入「小朋友學習狀況。」等導致嚴格相等失敗、看不到處理中訊息。
 */
export function matchesParentLearningOverviewQuery(raw: string): boolean {
  let n = normalizeLineInput(raw).replace(/\u200b/g, "");
  n = n.replace(/[。．.!?！？;；、，,?？]+$/u, "").trim();
  n = n.replace(/\s+/g, "");
  return n === PARENT_LEARNING_OVERVIEW_QUERY_KEY;
}

/**
 * 將單一段字串對應到科目；支援別名（不分大小寫之英文關鍵字另判斷）。
 */
export function resolveSubjectToken(token: string): SubjectResolution {
  const t = normalizeLineInput(token);
  if (!t) return { status: "unknown" };

  const lowerAscii = t.toLowerCase();

  const aliases: { code: SubjectCode; label: string; keys: string[] }[] = [
    {
      code: "science",
      label: "理化",
      keys: ["理化", "科學", "自然"],
    },
    { code: "math", label: "數學", keys: ["數學", "math"] },
    { code: "english", label: "英文", keys: ["英文", "英語", "english"] },
  ];

  for (const row of aliases) {
    for (const k of row.keys) {
      if (/^[a-z]+$/i.test(k)) {
        if (lowerAscii === k.toLowerCase()) {
          return { status: "known", code: row.code, displayLabel: row.label };
        }
      } else if (t === k) {
        return { status: "known", code: row.code, displayLabel: row.label };
      }
    }
  }

  return { status: "unknown" };
}

export type SubjectStepParse =
  | { mode: "subject_only"; resolution: SubjectResolution }
  | {
      mode: "student_and_subject";
      studentNameRaw: string;
      resolution: SubjectResolution;
    }
  | { mode: "empty" };

/**
 * 解析「科目」或「學生姓名 科目」（姓名可含空格，科目為最後一段）。
 */
export function parseSubjectStepInput(raw: string): SubjectStepParse {
  const n = normalizeLineInput(raw);
  if (!n) return { mode: "empty" };

  const lastSpace = n.lastIndexOf(" ");
  if (lastSpace === -1) {
    return { mode: "subject_only", resolution: resolveSubjectToken(n) };
  }

  const studentPart = n.slice(0, lastSpace).trim();
  const subjectPart = n.slice(lastSpace + 1).trim();
  if (!studentPart || !subjectPart) {
    return { mode: "subject_only", resolution: resolveSubjectToken(n) };
  }

  return {
    mode: "student_and_subject",
    studentNameRaw: studentPart.replace(/\s+/g, ""),
    resolution: resolveSubjectToken(subjectPart),
  };
}

/** 整段輸入是否僅為已知科目（用於「無 context 卻只輸入科目」判斷） */
export function isSubjectOnlyLine(raw: string): boolean {
  const n = normalizeLineInput(raw);
  if (!n || n.includes(" ")) return false;
  const r = resolveSubjectToken(n);
  return r.status === "known";
}
