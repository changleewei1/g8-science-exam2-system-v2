import type { StudentRepository } from "@/domain/repositories";
import { verifyPassword } from "@/lib/password";
import { signStudentSession } from "@/lib/session";

export class LoginStudentUseCase {
  constructor(private readonly students: StudentRepository) {}

  async execute(
    studentCode: string,
    password?: string,
  ): Promise<{ token: string; studentId: string; name: string } | null> {
    const student = await this.students.findByStudentCode(studentCode.trim());
    if (!student || !student.canLogin()) return null;

    if (student.requiresPassword()) {
      if (!password || !verifyPassword(password, student.passwordHash)) return null;
    }

    const token = await signStudentSession(student.id);
    return { token, studentId: student.id, name: student.name };
  }
}
