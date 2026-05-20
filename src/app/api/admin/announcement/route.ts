import { NextResponse } from "next/server";
import { getHomeAnnouncementForAdmin, upsertHomeAnnouncement } from "@/lib/system-announcement";
import { getAdminSession } from "@/lib/session";
import { adminAnnouncementPutBodySchema } from "@/lib/validation";

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  try {
    const announcement = await getHomeAnnouncementForAdmin();
    return NextResponse.json({ announcement });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }
  const parsed = adminAnnouncementPutBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: parsed.error.flatten() }, { status: 400 });
  }
  const items = parsed.data.items.map((s) => s.trim()).filter(Boolean);
  if (!items.length) {
    return NextResponse.json({ error: "VALIDATION_ERROR", details: "條目不可全為空白" }, { status: 400 });
  }
  const title = (parsed.data.title ?? "").trim();
  try {
    await upsertHomeAnnouncement({
      title: title || "系統公告",
      items,
    });
    const announcement = await getHomeAnnouncementForAdmin();
    return NextResponse.json({ ok: true, announcement });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UNKNOWN";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
