import { NextResponse } from "next/server";
import { getProfile, getMemories, getReadingCount } from "@/lib/kv";
import { buildSystemPreview, SNAPSHOT_DATE } from "@/lib/system-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [profile, memories, readingCount] = await Promise.all([
    getProfile().catch(() => ({})),
    getMemories().catch(() => []),
    getReadingCount().catch(() => 0),
  ]);
  const prompt = buildSystemPreview(profile, memories, readingCount);
  return NextResponse.json({
    prompt,
    snapshotDate: SNAPSHOT_DATE,
    readOnly: true,
    dynamicParts: ["profil", "mémoires", "compteur lectures", "date"],
  });
}
