import type { StudentRepository } from "@/domain/repositories";
import { hashPassword } from "@/lib/password";
import {
  buildStudentCode,
  generateSciG8Password,
  nextSeatForClass,
  parseSeatFromStudentCode,
} from "@/lib/student-credentials";

export type AdminStudentListItem = {
  id: string;
  studentCode: string;
  name: string;
  className: string | null;
  grade: number;
  passwordStatus: "已設定" | "未設定";
  createdAt: string;
};

export type CreateStudentResult = {
  id: string;
  studentCode: string;
  name: string;
  plainPassword: string;
};

export type ImportRowInput = {
  name: string;
  className: string;
  grade: number;
  /** 未給則自動遞增座號 */
  seat?: number;
};

/**
 * 老師後台：建立學生、匯入、重設密碼（帳密規則見 student-credentials）
 */
export class StudentAdminService {
  constructor(private readonly students: StudentRepository) {}

  async listForAdmin(): Promise<AdminStudentListItem[]> {
    const all = await this.students.findAll();
    return all.map((s) => ({
      id: s.id,
      studentCode: s.studentCode,
      name: s.name,
      className: s.className,
      grade: s.grade,
      passwordStatus: s.requiresPassword() ? "已設定" : "未設定",
      createdAt: s.createdAt ?? "",
    }));
  }

  async createStudent(input: {
    name: string;
    className: string;
    grade: number;
    seat?: number;
  }): Promise<CreateStudentResult> {
    const cls = input.className.trim();
    const inClass = await this.students.findByClassName(cls);
    const codes = inClass.map((s) => s.studentCode);
    const seat = input.seat ?? nextSeatForClass(cls, codes);
    const studentCode = buildStudentCode(cls, seat);
    const existing = await this.students.findByStudentCode(studentCode);
    if (existing) {
      throw new Error(`學號已存在：${studentCode}`);
    }
    const plainPassword = generateSciG8Password(seat);
    const password_hash = hashPassword(plainPassword);
    const { id } = await this.students.insert({
      student_code: studentCode,
      name: input.name.trim(),
      grade: input.grade,
      class_name: cls,
      is_active: true,
      password_hash,
    });
    return { id, studentCode, name: input.name.trim(), plainPassword };
  }

  async importStudents(rows: ImportRowInput[]): Promise<CreateStudentResult[]> {
    const out: CreateStudentResult[] = [];
    const nextSeatByClass = new Map<string, number>();

    for (const row of rows) {
      const cls = row.className.trim();
      let seat = row.seat;
      if (seat == null) {
        if (!nextSeatByClass.has(cls)) {
          const inClass = await this.students.findByClassName(cls);
          const codes = inClass.map((s) => s.studentCode);
          nextSeatByClass.set(cls, nextSeatForClass(cls, codes));
        }
        seat = nextSeatByClass.get(cls)!;
        nextSeatByClass.set(cls, seat + 1);
      }

      const r = await this.createStudent({
        name: row.name,
        className: cls,
        grade: row.grade,
        seat,
      });
      out.push(r);
    }
    return out;
  }

  async resetPassword(studentId: string): Promise<{ plainPassword: string }> {
    const s = await this.students.findById(studentId);
    if (!s || !s.className) throw new Error("找不到學生或缺少班級");
    const cls = s.className.trim();
    const inClass = await this.students.findByClassName(cls);
    const self = inClass.find((x) => x.id === studentId);
    if (!self) throw new Error("找不到學生");
    let seat = parseSeatFromStudentCode(cls, self.studentCode);
    if (seat == null) {
      seat = nextSeatForClass(
        cls,
        inClass.map((x) => x.studentCode),
      );
    }
    const plainPassword = generateSciG8Password(seat);
    await this.students.updatePasswordHash(studentId, hashPassword(plainPassword));
    return { plainPassword };
  }
}
