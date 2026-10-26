import { NextResponse } from "next/server";
import { getHistory, getHistoryLength, getVoiceLog, getPhotoLog } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit")) || 60));
  const [messages, total, voices, photos] = await Promise.all([
    getHistory(limit),
    getHistoryLength(),
    getVoiceLog(),
    getPhotoLog(),
  ]);

  // re-link dashboard media to user messages by exact content match (FIFO,
  // chronological), since the bot history is text-only and index-unstable.
  const vPools = new Map<string, { id: string; durationMs: number }[]>();
  for (const v of voices) {
    const arr = vPools.get(v.content) ?? [];
    arr.push({ id: v.id, durationMs: v.durationMs });
    vPools.set(v.content, arr);
  }
  const pPools = new Map<string, string[]>();
  for (const p of photos) {
    const arr = pPools.get(p.content) ?? [];
    arr.push(p.id);
    pPools.set(p.content, arr);
  }
  for (const m of messages) {
    if (m.role !== "user") continue;
    const v = vPools.get(m.content);
    if (v && v.length) {
      const hit = v.shift()!;
      m.voiceId = hit.id;
      m.durationMs = hit.durationMs;
      continue;
    }
    const p = pPools.get(m.content);
    if (p && p.length) m.photoId = p.shift()!;
  }

  return NextResponse.json({ messages, total });
}
