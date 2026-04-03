import type { Student } from "@/domain/entities";

export type StudentInsertRow = {
  student_code: string;
  name: string;
  grade: number;
  class_name: string;
  is_active: boolean;
  password_hash: string | null;
};

export interface StudentRepository {
  findById(id: string): Promise<Student | null>;
  findByStudentCode(code: string): Promise<Student | null>;
  findAll(): Promise<Student[]>;
  findByClassName(className: string): Promise<Student[]>;
  insert(row: StudentInsertRow): Promise<{ id: string }>;
  updatePasswordHash(id: string, passwordHash: string | null): Promise<void>;
}
