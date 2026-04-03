import type { ScopeUnitRepository } from "@/domain/repositories";
import { scopeUnitFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import type { ScopeUnitRow } from "@/types/database";

export class SupabaseScopeUnitRepository implements ScopeUnitRepository {
  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("scope_units")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? scopeUnitFromRow(data as ScopeUnitRow) : null;
  }

  async findByExamScopeId(examScopeId: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("scope_units")
      .select("*")
      .eq("exam_scope_id", examScopeId)
      .order("sort_order");
    if (error) throw error;
    return (data as ScopeUnitRow[]).map(scopeUnitFromRow);
  }
}
