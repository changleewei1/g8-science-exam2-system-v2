/**
 * 匯出酸鹼中和（acid_base）相關題目至審核用 JSON / CSV。
 * 使用：npm run export:acid-base-review
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import {
  ACID_BASE_SCOPE_UNIT_ID,
  ACID_BASE_SKILL_CODES,
} from "./lib/acid-base-constants";

const OUT_JSON = "data/acid_base_question_review.json";
const OUT_CSV = "data/acid_base_question_review.csv";

type ReviewStatus = "keep" | "revise" | "remove" | "new";

type ReviewItem = {
  id: string;
  source_table: "question_bank_items" | "quiz_questions";
  unit: string;
  skill_code: string;
  question: string;
  choices: { A: string; B: string; C: string; D: string };
  answer: string;
  explanation: string | null;
  difficulty: string;
  quiz_id: string | null;
  video_id: string | null;
  status: ReviewStatus;
  quality_note: string;
  new_question: string;
  new_choices: { A: string; B: string; C: string; D: string };
  new_answer: string;
  new_explanation: string;
};

type ExportRoot = {
  meta: {
    scope: "acid_base";
    skill_codes: string[];
    scope_unit_id: string;
    exported_at: string;
    counts: { question_bank_items: number; quiz_questions: number };
  };
  items: ReviewItem[];
};

function emptyNewFields(): Pick<
  ReviewItem,
  | "status"
  | "quality_note"
  | "new_question"
  | "new_choices"
  | "new_answer"
  | "new_explanation"
> {
  return {
    status: "keep",
    quality_note: "",
    new_question: "",
    new_choices: { A: "", B: "", C: "", D: "" },
    new_answer: "",
    new_explanation: "",
  };
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: ReviewItem[]): string {
  const headers = [
    "id",
    "source_table",
    "unit",
    "skill_code",
    "question",
    "choice_a",
    "choice_b",
    "choice_c",
    "choice_d",
    "answer",
    "explanation",
    "difficulty",
    "quiz_id",
    "video_id",
    "status",
    "quality_note",
    "new_question",
    "new_choice_a",
    "new_choice_b",
    "new_choice_c",
    "new_choice_d",
    "new_answer",
    "new_explanation",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.source_table),
        csvEscape(r.unit),
        csvEscape(r.skill_code),
        csvEscape(r.question),
        csvEscape(r.choices.A),
        csvEscape(r.choices.B),
        csvEscape(r.choices.C),
        csvEscape(r.choices.D),
        csvEscape(r.answer),
        csvEscape(r.explanation ?? ""),
        csvEscape(r.difficulty),
        csvEscape(r.quiz_id ?? ""),
        csvEscape(r.video_id ?? ""),
        csvEscape(r.status),
        csvEscape(r.quality_note),
        csvEscape(r.new_question),
        csvEscape(r.new_choices.A),
        csvEscape(r.new_choices.B),
        csvEscape(r.new_choices.C),
        csvEscape(r.new_choices.D),
        csvEscape(r.new_answer),
        csvEscape(r.new_explanation),
      ].join(","),
    );
  }
  return lines.join("\n");
}

async function main() {
  const codes = [...ACID_BASE_SKILL_CODES];
  const supabase = getSupabaseAdmin();

  const { data: bankRows, error: bankErr } = await supabase
    .from("question_bank_items")
    .select("*")
    .in("skill_code", codes)
    .order("sort_order");
  if (bankErr) throw bankErr;

  const { data: qqRows, error: qqErr } = await supabase
    .from("quiz_questions")
    .select("*")
    .in("skill_code", codes)
    .order("sort_order");
  if (qqErr) throw qqErr;

  const quizIds = [...new Set((qqRows ?? []).map((r: { quiz_id: string }) => r.quiz_id))];
  let acidQuizIdToVideo = new Map<string, string>();

  if (quizIds.length > 0) {
    const { data: quizzes, error: qzErr } = await supabase
      .from("quizzes")
      .select("id, video_id")
      .in("id", quizIds);
    if (qzErr) throw qzErr;
    const videoIds = [...new Set((quizzes ?? []).map((q: { video_id: string }) => q.video_id))];
    const { data: videos, error: vErr } = await supabase
      .from("videos")
      .select("id, unit_id")
      .in("id", videoIds);
    if (vErr) throw vErr;
    const acidVideos = new Set(
      (videos ?? [])
        .filter((v: { unit_id: string }) => v.unit_id === ACID_BASE_SCOPE_UNIT_ID)
        .map((v: { id: string }) => v.id),
    );
    for (const q of quizzes ?? []) {
      const row = q as { id: string; video_id: string };
      if (acidVideos.has(row.video_id)) {
        acidQuizIdToVideo.set(row.id, row.video_id);
      }
    }
  }

  const items: ReviewItem[] = [];

  for (const raw of bankRows ?? []) {
    const r = raw as {
      id: string;
      unit: string;
      skill_code: string;
      question_text: string;
      choice_a: string;
      choice_b: string;
      choice_c: string;
      choice_d: string;
      correct_answer: string;
      explanation: string | null;
      difficulty: string;
    };
    items.push({
      id: r.id,
      source_table: "question_bank_items",
      unit: r.unit,
      skill_code: r.skill_code,
      question: r.question_text,
      choices: { A: r.choice_a, B: r.choice_b, C: r.choice_c, D: r.choice_d },
      answer: r.correct_answer,
      explanation: r.explanation,
      difficulty: r.difficulty,
      quiz_id: null,
      video_id: null,
      ...emptyNewFields(),
    });
  }

  for (const raw of qqRows ?? []) {
    const r = raw as {
      id: string;
      quiz_id: string;
      question_text: string;
      choice_a: string;
      choice_b: string;
      choice_c: string;
      choice_d: string;
      correct_answer: string;
      explanation: string | null;
      difficulty: string | null;
      skill_code: string;
    };
    if (!acidQuizIdToVideo.has(r.quiz_id)) continue;
    const videoId = acidQuizIdToVideo.get(r.quiz_id) ?? null;
    items.push({
      id: r.id,
      source_table: "quiz_questions",
      unit: "acid_base",
      skill_code: r.skill_code,
      question: r.question_text,
      choices: { A: r.choice_a, B: r.choice_b, C: r.choice_c, D: r.choice_d },
      answer: r.correct_answer,
      explanation: r.explanation,
      difficulty: r.difficulty ?? "",
      quiz_id: r.quiz_id,
      video_id: videoId,
      ...emptyNewFields(),
    });
  }

  const root: ExportRoot = {
    meta: {
      scope: "acid_base",
      skill_codes: codes.sort(),
      scope_unit_id: ACID_BASE_SCOPE_UNIT_ID,
      exported_at: new Date().toISOString(),
      counts: {
        question_bank_items: items.filter((i) => i.source_table === "question_bank_items").length,
        quiz_questions: items.filter((i) => i.source_table === "quiz_questions").length,
      },
    },
    items,
  };

  const jsonPath = join(process.cwd(), OUT_JSON);
  const csvPath = join(process.cwd(), OUT_CSV);
  writeFileSync(jsonPath, JSON.stringify(root, null, 2), "utf8");
  writeFileSync(csvPath, toCsv(items), "utf8");

  console.log("酸鹼中和題庫匯出完成（skill_code 僅 EL/AB/CO/NE 範圍，quiz 再篩 unit）");
  console.log(`  question_bank_items：${root.meta.counts.question_bank_items} 筆（全部納入）`);
  console.log(
    `  quiz_questions（酸鹼單元影片）：${root.meta.counts.quiz_questions} 筆`,
  );
  console.log(`  總列數：${items.length}`);
  console.log(`  JSON：${OUT_JSON}`);
  console.log(`  CSV：${OUT_CSV}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
