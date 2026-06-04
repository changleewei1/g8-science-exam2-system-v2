import type {
  QuizQuestionInsert,
  QuizQuestionRepository,
  QuizQuestionSyncPayload,
} from "@/domain/repositories";
import { quizQuestionFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { QuizQuestionRow } from "@/types/database";

export class SupabaseQuizQuestionRepository implements QuizQuestionRepository {
  async findByQuizId(quizId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("sort_order");
    throwIfPostgrestError(error);
    return (data as QuizQuestionRow[]).map(quizQuestionFromRow);
  }

  async insertMany(questions: QuizQuestionInsert[]) {
    if (questions.length === 0) return;
    const { error } = await getSupabaseAdmin().from("quiz_questions").insert(questions);
    throwIfPostgrestError(error);
  }

  async syncQuestionsForQuiz(
    quizId: string,
    items: QuizQuestionSyncPayload[],
    options?: { bankChangeReason?: string | null },
  ) {
    if (items.length < 1) {
      throw new Error("AT_LEAST_ONE_QUESTION_REQUIRED");
    }
    const existing = await this.findByQuizId(quizId);
    const sorted = [...existing].sort((a, b) => a.sortOrder - b.sortOrder);

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const letter = it.correct_answer.trim().toUpperCase().charAt(0);
      const payload = {
        question_text: it.question_text.trim(),
        question_type: "mcq",
        choice_a: it.choice_a.trim(),
        choice_b: it.choice_b.trim(),
        choice_c: it.choice_c.trim(),
        choice_d: it.choice_d.trim(),
        correct_answer: letter,
        explanation: it.explanation?.trim() ? it.explanation.trim() : null,
        sort_order: i,
        difficulty: it.difficulty?.trim() ? it.difficulty.trim() : null,
        skill_code: it.skill_code.trim(),
        question_image_url: it.question_image_url,
        reference_image_url: it.reference_image_url,
        choice_a_image_url: it.choice_a_image_url,
        choice_b_image_url: it.choice_b_image_url,
        choice_c_image_url: it.choice_c_image_url,
        choice_d_image_url: it.choice_d_image_url,
      };
      const row = sorted[i];
      if (row) {
        const { error } = await getSupabaseAdmin()
          .from("quiz_questions")
          .update(payload)
          .eq("id", row.id)
          .eq("quiz_id", quizId);
        throwIfPostgrestError(error);
        const bankId = row.questionBankItemId?.trim();
        if (bankId) {
          const reason =
            (options?.bankChangeReason?.trim() || "老師於影片測驗編輯更新題目").slice(0, 500);
          const { error: bErr } = await getSupabaseAdmin()
            .from("question_bank_items")
            .update({
              question_text: payload.question_text,
              choice_a: payload.choice_a,
              choice_b: payload.choice_b,
              choice_c: payload.choice_c,
              choice_d: payload.choice_d,
              correct_answer: letter,
              explanation: payload.explanation,
              difficulty: payload.difficulty,
              skill_code: payload.skill_code,
              change_reason: reason,
            })
            .eq("id", bankId);
          throwIfPostgrestError(bErr);
        }
      } else {
        const { error } = await getSupabaseAdmin()
          .from("quiz_questions")
          .insert({ quiz_id: quizId, ...payload });
        throwIfPostgrestError(error);
      }
    }

    for (const extra of sorted.slice(items.length)) {
      const { error } = await getSupabaseAdmin()
        .from("quiz_questions")
        .delete()
        .eq("id", extra.id)
        .eq("quiz_id", quizId);
      throwIfPostgrestError(error);
    }
  }
}
