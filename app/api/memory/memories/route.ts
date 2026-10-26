import { NextResponse } from "next/server";
import { getMemories, addMemory, deleteMemory } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const memories = await getMemories();
  return NextResponse.json({ memories });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return NextResponse.json({ error: "text requis" }, { status: 400 });

  // mirror the bot's "[date] text" convention
  const dated = body?.raw === true ? text : `[${new Date().toLocaleDateString("fr-FR")}] ${text}`;
  await addMemory(dated);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const index = Number(body?.index);
  if (!Number.isInteger(index) || index < 0) {
    return NextResponse.json({ error: "index invalide" }, { status: 400 });
  }
  await deleteMemory(index);
  return NextResponse.json({ ok: true });
}
