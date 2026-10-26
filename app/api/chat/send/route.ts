import { NextResponse } from "next/server";
import { getHistoryLength } from "@/lib/kv";
import { sendFakeUpdate } from "@/lib/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text requis" }, { status: 400 });

  // record the length before so the client can detect the new assistant reply
  const lenBefore = await getHistoryLength().catch(() => 0);
  try {
    await sendFakeUpdate(text);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, lenBefore });
}
