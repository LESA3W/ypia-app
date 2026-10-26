import { NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const locale = body?.locale;
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "locale invalide" }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, locale });
  res.cookies.set({
    name: LOCALE_COOKIE,
    value: locale,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
