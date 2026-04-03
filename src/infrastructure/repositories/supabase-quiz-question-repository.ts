import type { QuizQuestionInsert, QuizQuestionRepository } from "@/domain/repositories";
import { quizQuestionFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import type { QuizQuestionRow } from "@/types/database";

export class SupabaseQuizQuestionRepository implements QuizQuestionRepository {
  async findByQuizId(quizId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("quiz_questions")
      .select("*")
      .eq("quiz_id", quizId)
      .order("sort_order");
    if (error) throw error;
    return (data as QuizQuestionRow[]).map(quizQuestionFromRow);
  }

  async insertMany(questions: QuizQuestionInsert[]) {
    if (questions.length === 0) return;
    const { error } = await getSupabaseAdmin().from("quiz_questions").insert(questions);
    if (error) throw error;
  }
}
