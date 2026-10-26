import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE, isValidAuthCookie } from "@/lib/auth";

// Next.js 16: middleware is now "proxy". Same functionality.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // public paths
  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  const ok = await isValidAuthCookie(cookie);

  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons/|sw.js|robots.txt|[^/]+\\.(?:png|jpg|jpeg|svg|webp|gif|ico)).*)",
  ],
};
