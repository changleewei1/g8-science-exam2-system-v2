import type { StudentInsertRow, StudentRepository } from "@/domain/repositories";
import { studentFromRow } from "@/infrastructure/mappers/entity-mappers";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { throwIfPostgrestError } from "@/lib/supabase-user-message";
import type { StudentRow } from "@/types/database";

export class SupabaseStudentRepository implements StudentRepository {
  async insert(row: StudentInsertRow) {
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .insert(row)
      .select("id")
      .single();
    throwIfPostgrestError(error);
    return data as { id: string };
  }

  async updatePasswordHash(id: string, passwordHash: string | null) {
    const { error } = await getSupabaseAdmin()
      .from("students")
      .update({ password_hash: passwordHash })
      .eq("id", id);
    throwIfPostgrestError(error);
  }

  async findById(id: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? studentFromRow(data as StudentRow) : null;
  }

  async findByStudentCode(code: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .select("*")
      .eq("student_code", code)
      .maybeSingle();
    throwIfPostgrestError(error);
    return data ? studentFromRow(data as StudentRow) : null;
  }

  async findAll() {
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .select("*")
      .order("student_code");
    throwIfPostgrestError(error);
    return (data as StudentRow[]).map(studentFromRow);
  }

  async findByClassName(className: string) {
    const { data, error } = await getSupabaseAdmin()
      .from("students")
      .select("*")
      .eq("class_name", className)
      .eq("is_active", true)
      .order("student_code");
    throwIfPostgrestError(error);
    return (data as StudentRow[]).map(studentFromRow);
  }
}
