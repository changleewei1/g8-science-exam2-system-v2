import { getEnv } from "@/lib/env";
import { signAdminSession } from "@/lib/session";

export class LoginAdminUseCase {
  async execute(secret: string): Promise<{ token: string } | null> {
    const expected = getEnv("ADMIN_DASHBOARD_SECRET");
    if (!expected || secret !== expected) return null;
    const token = await signAdminSession();
    return { token };
  }
}
