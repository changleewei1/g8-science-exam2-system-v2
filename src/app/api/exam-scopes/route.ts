import { NextResponse } from "next/server";
import { getRepositories } from "@/infrastructure/composition";

/** 列出啟用中的段考範圍（供儀表板選擇） */
export async function GET() {
  const { examScopes } = getRepositories();
  const scopes = await examScopes.findAllActive();
  return NextResponse.json({
    scopes: scopes.map((s) => ({
      id: s.id,
      title: s.title,
      subject: s.subject,
      grade: s.grade,
      term: s.term,
      examNo: s.examNo,
    })),
  });
}
