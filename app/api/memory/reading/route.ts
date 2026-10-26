import { NextResponse } from "next/server";
import { getReadingCount, setReadingCount, getReadingLog, addReadingLogEntry } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [count, log] = await Promise.all([getReadingCount(), getReadingLog()]);
  return NextResponse.json({ count, log });
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);

  if (body?.increment === true) {
    const current = await getReadingCount();
    const next = current + 1;
    await setReadingCount(next);
    const note = typeof body?.note === "string" ? body.note : "";
    await addReadingLogEntry(
      `[${new Date().toLocaleDateString("fr-FR")}] #${next}${note ? " — " + note : ""}`
    );
    return NextResponse.json({ ok: true, count: next });
  }

  const count = Number(body?.count);
  if (!Number.isFinite(count) || count < 0) {
    return NextResponse.json({ error: "count invalide" }, { status: 400 });
  }
  await setReadingCount(count);
  return NextResponse.json({ ok: true, count: Math.floor(count) });
}
