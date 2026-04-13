import type { QuizInsert, QuizRepository } from "@/domain/repositories";
import { quizFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { QuizRow } from "@/types/database";

export class SupabaseQuizRepository implements QuizRepository {
  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("quizzes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? quizFromRow(data as QuizRow) : null;
  }

  async findByVideoId(videoId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("quizzes")
      .select("*")
      .eq("video_id", videoId)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? quizFromRow(data as QuizRow) : null;
  }

  async insert(quiz: QuizInsert) {
    const { data, error } = await getSupabaseAdmin()
      .from("quizzes")
      .insert(quiz)
      .select("id")
      .single();
    throwIfPostgrestError(error);
    return { id: (data as { id: string }).id };
  }

  async syncQuestionCountMeta(quizId: string, questionCount: number) {
    const quiz = await this.findById(quizId);
    if (!quiz) return;
    const passScore = Math.min(quiz.passScore, questionCount);
    const { error } = await getSupabaseAdmin()
      .from("quizzes")
      .update({
        question_count: questionCount,
        pass_score: passScore,
      })
      .eq("id", quizId);
    throwIfPostgrestError(error);
  }
}
