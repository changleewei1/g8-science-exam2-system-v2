import { NextResponse } from "next/server";
import { z } from "zod";
import {
  countUnreadQuestionUpdateNotifications,
  markQuestionUpdateNotificationsReadByNotificationIds,
  markQuestionUpdateNotificationsReadByQuestionIds,
  markQuestionUpdateNotificationsReadByVideoId,
} from "@/lib/student-question-update-notifications";
import { getStudentSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const readBodySchema = z
  .object({
    notificationIds: z.array(z.string().uuid()).optional(),
    questionIds: z.array(z.string().uuid()).optional(),
    videoId: z.string().uuid().optional(),
  })
  .refine(
    (b) =>
      Boolean(
        (b.notificationIds && b.notificationIds.length > 0) ||
          (b.questionIds && b.questionIds.length > 0) ||
          b.videoId,
      ),
    { message: "至少需要 notificationIds、questionIds 或 videoId 其一" },
  );

export async function POST(req: Request) {
  const session = await getStudentSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = readBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const sid = session.studentId;
  if (parsed.data.notificationIds?.length) {
    await markQuestionUpdateNotificationsReadByNotificationIds(sid, parsed.data.notificationIds);
  }
  if (parsed.data.questionIds?.length) {
    await markQuestionUpdateNotificationsReadByQuestionIds(sid, parsed.data.questionIds);
  }
  if (parsed.data.videoId) {
    await markQuestionUpdateNotificationsReadByVideoId(sid, parsed.data.videoId);
  }

  const unreadCount = await countUnreadQuestionUpdateNotifications(sid);
  return NextResponse.json({ ok: true, unreadCount });
}
