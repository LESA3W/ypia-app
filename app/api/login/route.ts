import { NextResponse } from "next/server";
import { AUTH_COOKIE, COOKIE_MAX_AGE, expectedCookieValue, verifyCredentials } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
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

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: AUTH_COOKIE,
    value: await expectedCookieValue(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
