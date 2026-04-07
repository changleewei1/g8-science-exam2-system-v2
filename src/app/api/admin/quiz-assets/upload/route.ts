import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/infrastructure/supabase/admin-client";
import { getAdminSession } from "@/lib/session";
import { randomUUID } from "node:crypto";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024;

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  return mime.split("/")[1] ?? "bin";
}

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "INVALID_FORM" }, { status: 400 });
  }

  const file = form.get("file");
  const quizIdRaw = form.get("quizId");
  const quizId = typeof quizIdRaw === "string" && quizIdRaw.length > 0 ? quizIdRaw : "general";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "INVALID_IMAGE_TYPE" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const path = `${quizId}/${randomUUID()}.${extFromMime(file.type)}`;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from("quiz-assets").upload(path, buf, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from("quiz-assets").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
