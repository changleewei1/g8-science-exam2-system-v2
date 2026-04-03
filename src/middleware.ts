import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const studentCookie = "g8_science_exam2_student_session";
const adminCookie = "g8_science_exam2_admin_session";

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s) return new Uint8Array();
  return new TextEncoder().encode(s);
}

function missingSessionSecretResponse() {
  return new NextResponse(
    "伺服器尚未正確設定（缺少 SESSION_SECRET）。請聯絡管理員或於部署平台設定環境變數。",
    {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    },
  );
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const secret = getSecret();
  const isProd = process.env.NODE_ENV === "production";
  const secretMissing = secret.length === 0;

  if (path.startsWith("/student")) {
    if (secretMissing) {
      if (isProd) return missingSessionSecretResponse();
      return NextResponse.next();
    }
    const token = request.cookies.get(studentCookie)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "student") throw new Error("role");
    } catch {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  if (path.startsWith("/admin") && path !== "/admin/login") {
    if (secretMissing) {
      if (isProd) return missingSessionSecretResponse();
      return NextResponse.next();
    }
    const token = request.cookies.get(adminCookie)?.value;
    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    try {
      const { payload } = await jwtVerify(token, secret);
      if (payload.role !== "admin") throw new Error("role");
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/student/:path*", "/admin", "/admin/:path*"],
};
