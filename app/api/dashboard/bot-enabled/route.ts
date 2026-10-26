import { NextResponse } from "next/server";
import { getBotEnabled, setBotEnabled } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const enabled = await getBotEnabled();
  return NextResponse.json({ enabled });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled (boolean) requis" }, { status: 400 });
  }
  await setBotEnabled(body.enabled);
  return NextResponse.json({ ok: true, enabled: body.enabled });
}
