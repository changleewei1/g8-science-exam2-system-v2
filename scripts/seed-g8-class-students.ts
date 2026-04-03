/**
 * 將 data/g8_class_credentials.json 寫入 students（國二、班級代號可自訂）
 * 使用：npm run seed:g8-students
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { hashPassword } from "../src/lib/password";
import { getSupabaseAdmin } from "../src/infrastructure/supabase/admin-client";

type Row = { studentCode: string; name: string; password: string; className?: string; grade?: number };

async function main() {
  const path = join(process.cwd(), "data/g8_class_credentials.json");
  const rows = JSON.parse(readFileSync(path, "utf8")) as Row[];
  if (!rows.length) {
    console.log("data/g8_class_credentials.json 為空陣列，無需寫入。");
    return;
  }

  const supabase = getSupabaseAdmin();

  for (const r of rows) {
    const password_hash = hashPassword(r.password);
    const grade = r.grade ?? 8;
    const class_name = r.className ?? "801";
    const { error } = await supabase.from("students").upsert(
      {
        student_code: r.studentCode,
        name: r.name,
        grade,
        class_name,
        is_active: true,
        password_hash,
      },
      { onConflict: "student_code" },
    );
    if (error) throw error;
    console.log("OK", r.studentCode, r.name);
  }

  console.log("完成：", rows.length, "人。帳密見 data/g8_class_credentials.json");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
