import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE } from "@/lib/auth";
import { destroySession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const store = await cookies();
  const sid = store.get(AUTH_COOKIE)?.value;
  // Revoke server-side so a copied cookie stops working immediately.
  await destroySession(sid);

  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: AUTH_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
