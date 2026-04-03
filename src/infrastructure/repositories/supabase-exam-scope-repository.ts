import type { ExamScopeRepository } from "@/domain/repositories";
import { examScopeFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { ExamScopeRow } from "@/types/database";

export class SupabaseExamScopeRepository implements ExamScopeRepository {
  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("exam_scopes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? examScopeFromRow(data as ExamScopeRow) : null;
  }

  async findAllActive() {
    const { data, error } = await getSupabaseAdmin()
      .from("exam_scopes")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    throwIfPostgrestError(error);
    return (data as ExamScopeRow[]).map(examScopeFromRow);
  }
}
