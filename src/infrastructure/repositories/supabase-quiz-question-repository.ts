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

  async syncExactlyThreeForQuiz(quizId: string, items: QuizQuestionSyncPayload[]) {
    if (items.length !== 3) {
      throw new Error("THREE_QUESTIONS_REQUIRED");
    }
    const existing = await this.findByQuizId(quizId);
    const sorted = [...existing].sort((a, b) => a.sortOrder - b.sortOrder);

    for (let i = 0; i < 3; i++) {
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
      };
      const row = sorted[i];
      if (row) {
        const { error } = await getSupabaseAdmin()
          .from("quiz_questions")
          .update(payload)
          .eq("id", row.id)
          .eq("quiz_id", quizId);
        throwIfPostgrestError(error);
      } else {
        const { error } = await getSupabaseAdmin()
          .from("quiz_questions")
          .insert({ quiz_id: quizId, ...payload });
        throwIfPostgrestError(error);
      }
    }

    for (const extra of sorted.slice(3)) {
      const { error } = await getSupabaseAdmin()
        .from("quiz_questions")
        .delete()
        .eq("id", extra.id)
        .eq("quiz_id", quizId);
      throwIfPostgrestError(error);
    }
  }
}
