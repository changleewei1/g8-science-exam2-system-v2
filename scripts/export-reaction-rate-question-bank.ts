/**
 * 匯出反應速率（reaction_rate，RS01–RS11）題庫審核用 JSON / CSV。
 * 使用：npm run export:reaction-rate-review
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";
import {
  REACTION_RATE_SCOPE_UNIT_ID,
  REACTION_RATE_SKILL_CODES,
  REACTION_RATE_UNIT_SLUG,
  REACTION_RATE_BANK_UNIT_TITLE,
} from "./lib/reaction-rate-constants";

const OUT_JSON = "data/reaction_rate_question_review.json";
const OUT_CSV = "data/reaction_rate_question_review.csv";

type ReviewStatus = "keep" | "revise" | "remove" | "new";

type RelatedVideoRef = {
  video_id: string;
  video_title: string;
  video_sort_order: number;
};

export type ReactionRateReviewItem = {
  id: string;
  source_table: "question_bank_items" | "quiz_questions";
  unit: string;
  skill_code: string;
  difficulty: string;
  question_text: string;
  choice_a: string;
  choice_b: string;
  choice_c: string;
  choice_d: string;
  correct_answer: string;
  explanation: string | null;
  sort_order: number;
  quiz_id: string | null;
  video_id: string | null;
  video_title: string | null;
  /** 反應速率單元中，曾標記與此 skill_code 關聯的影片（供人工對照） */
  related_videos_for_skill: RelatedVideoRef[];
  excluded_from_video_quiz_pool: boolean | null;
  status: ReviewStatus;
  quality_note: string;
  /** 與 new_choice_a–d 擇一使用；同步腳本優先讀取物件 new_choices */
  new_choices: { A: string; B: string; C: string; D: string };
  new_question_text: string;
  new_choice_a: string;
  new_choice_b: string;
  new_choice_c: string;
  new_choice_d: string;
  new_answer: string;
  new_explanation: string;
  suggested_skill_code: string;
  suggested_video_id: string;
  source_match_note: string;
};

type ExportRoot = {
  meta: {
    scope: "reaction_rate";
    scope_unit_id: string;
    unit_slug: string;
    unit_title_zh: string;
    skill_codes: string[];
    exported_at: string;
    counts: {
      question_bank_items: number;
      quiz_questions: number;
      reaction_rate_question_candidates_pending: number;
    };
  };
  items: ReactionRateReviewItem[];
};

function emptyReviewFields(): Pick<
  ReactionRateReviewItem,
  | "status"
  | "quality_note"
  | "new_choices"
  | "new_question_text"
  | "new_choice_a"
  | "new_choice_b"
  | "new_choice_c"
  | "new_choice_d"
  | "new_answer"
  | "new_explanation"
  | "suggested_skill_code"
  | "suggested_video_id"
  | "source_match_note"
> {
  return {
    status: "keep",
    quality_note: "",
    new_choices: { A: "", B: "", C: "", D: "" },
    new_question_text: "",
    new_choice_a: "",
    new_choice_b: "",
    new_choice_c: "",
    new_choice_d: "",
    new_answer: "",
    new_explanation: "",
    suggested_skill_code: "",
    suggested_video_id: "",
    source_match_note: "",
  };
}

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: ReactionRateReviewItem[]): string {
  const headers = [
    "id",
    "source_table",
    "unit",
    "skill_code",
    "difficulty",
    "question_text",
    "choice_a",
    "choice_b",
    "choice_c",
    "choice_d",
    "correct_answer",
    "explanation",
    "sort_order",
    "quiz_id",
    "video_id",
    "video_title",
    "excluded_from_video_quiz_pool",
    "related_videos_for_skill",
    "status",
    "quality_note",
    "new_choices_json",
    "new_question_text",
    "new_choice_a",
    "new_choice_b",
    "new_choice_c",
    "new_choice_d",
    "new_answer",
    "new_explanation",
    "suggested_skill_code",
    "suggested_video_id",
    "source_match_note",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const rel = r.related_videos_for_skill
      .map((v) => `${v.video_id}:${v.video_title}`)
      .join(" | ");
    lines.push(
      [
        csvEscape(r.id),
        csvEscape(r.source_table),
        csvEscape(r.unit),
        csvEscape(r.skill_code),
        csvEscape(r.difficulty),
        csvEscape(r.question_text),
        csvEscape(r.choice_a),
        csvEscape(r.choice_b),
        csvEscape(r.choice_c),
        csvEscape(r.choice_d),
        csvEscape(r.correct_answer),
        csvEscape(r.explanation ?? ""),
        csvEscape(String(r.sort_order)),
        csvEscape(r.quiz_id ?? ""),
        csvEscape(r.video_id ?? ""),
        csvEscape(r.video_title ?? ""),
        csvEscape(r.excluded_from_video_quiz_pool == null ? "" : String(r.excluded_from_video_quiz_pool)),
        csvEscape(rel),
        csvEscape(r.status),
        csvEscape(r.quality_note),
        csvEscape(JSON.stringify(r.new_choices)),
        csvEscape(r.new_question_text),
        csvEscape(r.new_choice_a),
        csvEscape(r.new_choice_b),
        csvEscape(r.new_choice_c),
        csvEscape(r.new_choice_d),
        csvEscape(r.new_answer),
        csvEscape(r.new_explanation),
        csvEscape(r.suggested_skill_code),
        csvEscape(r.suggested_video_id),
        csvEscape(r.source_match_note),
      ].join(","),
    );
  }
  return lines.join("\n");
}

async function main() {
  const codes = [...REACTION_RATE_SKILL_CODES];
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

  const { data: unitVideos, error: vErr } = await supabase
    .from("videos")
    .select("id, title, sort_order, video_skill_tags(skill_code)")
    .eq("unit_id", REACTION_RATE_SCOPE_UNIT_ID);
  if (vErr) throw vErr;

  const normalizedVideos = (unitVideos ?? []).map((raw) => {
    const v = raw as { id: string; title: string; sort_order: number; video_skill_tags?: { skill_code: string }[] };
    const tags = Array.isArray(v.video_skill_tags) ? v.video_skill_tags : [];
    return {
      id: v.id,
      title: v.title,
      sort_order: v.sort_order,
      skillCodes: new Set(tags.map((t) => t.skill_code)),
    };
  });

  const skillToVideos = new Map<string, RelatedVideoRef[]>();
  for (const code of codes) {
    const list: RelatedVideoRef[] = [];
    for (const v of normalizedVideos) {
      if (v.skillCodes.has(code)) {
        list.push({
          video_id: v.id,
          video_title: v.title,
          video_sort_order: v.sort_order,
        });
      }
    }
    list.sort((a, b) => a.video_sort_order - b.video_sort_order || a.video_title.localeCompare(b.video_title));
    skillToVideos.set(code, list);
  }

  const videoTitleById = new Map<string, string>(
    normalizedVideos.map((v) => [v.id, v.title] as const),
  );

  const quizIds = [...new Set((qqRows ?? []).map((r: { quiz_id: string }) => r.quiz_id))];
  const rateQuizIdToVideo = new Map<string, { video_id: string; video_title: string }>();

  if (quizIds.length > 0) {
    const { data: quizzes, error: qzErr } = await supabase.from("quizzes").select("id, video_id").in("id", quizIds);
    if (qzErr) throw qzErr;
    const rateVideoIds = new Set(normalizedVideos.map((v) => v.id));
    for (const q of quizzes ?? []) {
      const row = q as { id: string; video_id: string };
      if (rateVideoIds.has(row.video_id)) {
        rateQuizIdToVideo.set(row.id, {
          video_id: row.video_id,
          video_title: videoTitleById.get(row.video_id) ?? "",
        });
      }
    }
  }

  const { count: pendingCandCount, error: cErr } = await supabase
    .from("reaction_rate_question_candidates")
    .select("id", { count: "exact", head: true })
    .eq("review_status", "pending");
  if (cErr) {
    console.warn(
      "（可忽略若尚未套用 migration）無法統計 reaction_rate_question_candidates：",
      cErr.message,
    );
  }

  const items: ReactionRateReviewItem[] = [];

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
      sort_order: number;
      excluded_from_video_quiz_pool?: boolean;
    };
    const rel = skillToVideos.get(r.skill_code) ?? [];
    items.push({
      id: r.id,
      source_table: "question_bank_items",
      unit: REACTION_RATE_UNIT_SLUG,
      skill_code: r.skill_code,
      difficulty: r.difficulty,
      question_text: r.question_text,
      choice_a: r.choice_a,
      choice_b: r.choice_b,
      choice_c: r.choice_c,
      choice_d: r.choice_d,
      correct_answer: r.correct_answer,
      explanation: r.explanation,
      sort_order: r.sort_order,
      quiz_id: null,
      video_id: null,
      video_title: null,
      related_videos_for_skill: rel,
      excluded_from_video_quiz_pool: r.excluded_from_video_quiz_pool ?? false,
      ...emptyReviewFields(),
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
      sort_order: number;
    };
    if (!rateQuizIdToVideo.has(r.quiz_id)) continue;
    const v = rateQuizIdToVideo.get(r.quiz_id)!;
    const rel = skillToVideos.get(r.skill_code) ?? [];
    items.push({
      id: r.id,
      source_table: "quiz_questions",
      unit: REACTION_RATE_UNIT_SLUG,
      skill_code: r.skill_code,
      difficulty: r.difficulty ?? "",
      question_text: r.question_text,
      choice_a: r.choice_a,
      choice_b: r.choice_b,
      choice_c: r.choice_c,
      choice_d: r.choice_d,
      correct_answer: r.correct_answer,
      explanation: r.explanation,
      sort_order: r.sort_order,
      quiz_id: r.quiz_id,
      video_id: v.video_id,
      video_title: v.video_title || null,
      related_videos_for_skill: rel,
      excluded_from_video_quiz_pool: null,
      ...emptyReviewFields(),
    });
  }

  const root: ExportRoot = {
    meta: {
      scope: "reaction_rate",
      scope_unit_id: REACTION_RATE_SCOPE_UNIT_ID,
      unit_slug: REACTION_RATE_UNIT_SLUG,
      unit_title_zh: REACTION_RATE_BANK_UNIT_TITLE,
      skill_codes: codes.sort(),
      exported_at: new Date().toISOString(),
      counts: {
        question_bank_items: items.filter((i) => i.source_table === "question_bank_items").length,
        quiz_questions: items.filter((i) => i.source_table === "quiz_questions").length,
        reaction_rate_question_candidates_pending: pendingCandCount ?? 0,
      },
    },
    items,
  };

  const jsonPath = join(process.cwd(), OUT_JSON);
  const csvPath = join(process.cwd(), OUT_CSV);
  writeFileSync(jsonPath, JSON.stringify(root, null, 2), "utf8");
  writeFileSync(csvPath, toCsv(items), "utf8");

  console.log("反應速率題庫匯出完成（僅 RS01–RS11；quiz_questions 再依反應速率影片篩選）");
  console.log(`  question_bank_items：${root.meta.counts.question_bank_items} 筆`);
  console.log(`  quiz_questions（反應速率影片）：${root.meta.counts.quiz_questions} 筆`);
  console.log(`  候選題 pending：${root.meta.counts.reaction_rate_question_candidates_pending} 筆`);
  console.log(`  總列數：${items.length}`);
  console.log(`  JSON：${OUT_JSON}`);
  console.log(`  CSV：${OUT_CSV}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
