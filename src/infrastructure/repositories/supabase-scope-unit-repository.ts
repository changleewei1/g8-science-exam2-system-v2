import type { ScopeUnitRepository } from "@/domain/repositories";
import { scopeUnitFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { ScopeUnitRow } from "@/types/database";

export class SupabaseScopeUnitRepository implements ScopeUnitRepository {
  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("scope_units")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? scopeUnitFromRow(data as ScopeUnitRow) : null;
  }

  async findByExamScopeId(examScopeId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("scope_units")
      .select("*")
      .eq("exam_scope_id", examScopeId)
      .order("sort_order");
    throwIfPostgrestError(error);
    return (data as ScopeUnitRow[]).map(scopeUnitFromRow);
  }
}
