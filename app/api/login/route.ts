import { NextResponse } from "next/server";
import { AUTH_COOKIE, COOKIE_MAX_AGE, verifyCredentials } from "@/lib/auth";
import { createSession, loginRateLimitOk } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Rate limit by client IP (Vercel sets x-forwarded-for). Fails open on Redis error.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!(await loginRateLimitOk(ip))) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives. Réessaie dans quelques minutes." },
      { status: 429 }
    );
  }

  let email = "";
  let password = "";
  try {
    const body = await request.json();
    email = typeof body?.email === "string" ? body.email : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ ok: false, error: "Identifiants invalides" }, { status: 400 });
  }

  if (!(await verifyCredentials(email, password))) {
    // Generic message — never reveal whether the email or the password was wrong.
    return NextResponse.json({ ok: false, error: "Identifiants invalides" }, { status: 401 });
  }

  // Random, revocable server-side session. The cookie carries only the opaque id.
  const sid = await createSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: sid,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
