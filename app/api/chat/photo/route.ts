import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getHistoryLength, storePhoto } from "@/lib/kv";
import { sendFakePhotoUpdate } from "@/lib/bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const dataUrl: unknown = body?.dataUrl;
  const caption = typeof body?.caption === "string" ? body.caption.slice(0, 400).trim() : "";
  if (typeof dataUrl !== "string" || !/^data:image\/[a-z+]+;base64,/i.test(dataUrl)) {
    return NextResponse.json({ error: "image requise" }, { status: 400 });
  }
  // rough size guard (base64 ~ 1.37x bytes)
  if (dataUrl.length > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "image trop lourde" }, { status: 413 });
  }

  // the bot stores the user message as the caption text, or "(photo envoyée)" if none
  const content = caption || "(photo envoyée)";
  const id = randomUUID();
  const lenBefore = await getHistoryLength().catch(() => 0);
  try {
    await storePhoto(id, content, dataUrl);
    await sendFakePhotoUpdate(dataUrl, caption);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
  return NextResponse.json({ ok: true, photoId: id, content, lenBefore });
}
