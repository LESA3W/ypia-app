import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getHistoryLength, storeVoice } from "@/lib/kv";
import { sendFakeUpdate } from "@/lib/bot";
import { transcribeAudio } from "@/lib/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let bytes: Buffer;
  let mime = "audio/webm";
  let durationMs = 0;
  try {
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof Blob)) {
      return NextResponse.json({ error: "audio requis" }, { status: 400 });
    }
    mime = audio.type || mime;
    bytes = Buffer.from(await audio.arrayBuffer());
    durationMs = Math.max(0, Math.round(Number(form.get("durationMs")) || 0));
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  if (bytes.length === 0) return NextResponse.json({ error: "audio vide" }, { status: 400 });
  if (bytes.length > 20 * 1024 * 1024) return NextResponse.json({ error: "audio trop long" }, { status: 413 });

  // transcribe so the bot can read + reply; the audio stays playable regardless
  const transcript = await transcribeAudio(bytes, mime);
  const sendText = transcript || "(message vocal)";

  // store the playable clip (base64 data URL) keyed by an id, linked by transcript
  const id = randomUUID();
  const dataUrl = `data:${mime};base64,${bytes.toString("base64")}`;
  const lenBefore = await getHistoryLength().catch(() => 0);
  try {
    await storeVoice(id, sendText, dataUrl, durationMs);
    await sendFakeUpdate(sendText);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, transcript: sendText }, { status: 502 });
  }
  return NextResponse.json({ ok: true, transcript: sendText, voiceId: id, durationMs, lenBefore });
}
