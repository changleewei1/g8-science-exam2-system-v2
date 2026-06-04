import { NextResponse } from "next/server";
import {
  countUnreadQuestionUpdateNotifications,
  fetchStudentQuestionUpdateNotifications,
} from "@/lib/student-question-update-notifications";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const [unreadCount, updates] = await Promise.all([
    countUnreadQuestionUpdateNotifications(session.studentId),
    fetchStudentQuestionUpdateNotifications(session.studentId, { onlyUnread: false, limit: 40 }),
  ]);

  return NextResponse.json({ unreadCount, updates });
}
