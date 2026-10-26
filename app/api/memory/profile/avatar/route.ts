import { NextResponse } from "next/server";
import { getAvatar, setAvatar, deleteAvatar } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 150 * 1024; // hard cap; client should send <100KB

export async function GET() {
  const avatar = await getAvatar();
  return NextResponse.json({ avatar });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
  if (!dataUrl.startsWith("data:image/")) {
    return NextResponse.json({ error: "dataUrl image attendu" }, { status: 400 });
  }
  // rough size guard (base64 length ~ 4/3 of bytes)
  if (dataUrl.length * 0.75 > MAX_BYTES) {
    return NextResponse.json({ error: "image trop lourde (>150KB)" }, { status: 413 });
  }
  await setAvatar(dataUrl);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await deleteAvatar();
  return NextResponse.json({ ok: true });
}
