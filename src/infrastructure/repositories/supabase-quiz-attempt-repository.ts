import type {
  AnswerInsert,
  AttemptInsert,
  AttemptAnswerRow,
  QuizAttemptRepository,
} from "@/domain/repositories";
import { quizAttemptFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { StudentQuizAttemptRow } from "@/types/database";

export class SupabaseQuizAttemptRepository implements QuizAttemptRepository {
  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_quiz_attempts")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? quizAttemptFromRow(data as StudentQuizAttemptRow) : null;
  }

  async createAttempt(input: AttemptInsert) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_quiz_attempts")
      .insert(input)
      .select("id")
      .single();
    throwIfPostgrestError(error);
    return { id: (data as { id: string }).id };
  }

  async updateAttempt(id: string, score: number, isPassed: boolean, submittedAt: string) {
    const { error } = await getSupabaseAdmin()
      .from("student_quiz_attempts")
      .update({ score, is_passed: isPassed, submitted_at: submittedAt })
      .eq("id", id);
    throwIfPostgrestError(error);
  }

  async insertAnswers(rows: AnswerInsert[]) {
    if (rows.length === 0) return;
    const { error } = await getSupabaseAdmin().from("student_quiz_answers").insert(rows);
    throwIfPostgrestError(error);
  }

  async findLatestByStudentAndQuiz(studentId: string, quizId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_quiz_attempts")
      .select("*")
      .eq("student_id", studentId)
      .eq("quiz_id", quizId)
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? quizAttemptFromRow(data as StudentQuizAttemptRow) : null;
  }

  async findByStudentId(studentId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("student_quiz_attempts")
      .select("*")
      .eq("student_id", studentId);
    throwIfPostgrestError(error);
    return (data as StudentQuizAttemptRow[]).map(quizAttemptFromRow);
  }

  async listAnswersByAttemptId(attemptId: string): Promise<AttemptAnswerRow[]> {
    const { data, error } = await getSupabaseAdmin()
      .from("student_quiz_answers")
      .select("question_id, selected_answer, is_correct")
      .eq("attempt_id", attemptId);
    throwIfPostgrestError(error);
    return (data ?? []) as AttemptAnswerRow[];
  }
}
