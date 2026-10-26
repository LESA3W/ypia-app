import { NextResponse } from "next/server";
import { getTelegramPhoto, setTelegramPhoto, removeTelegramPhoto } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const photo = await getTelegramPhoto();
  if (!photo) return new NextResponse(null, { status: 404 });
  return new NextResponse(photo.bytes, {
    status: 200,
    headers: { "Content-Type": photo.contentType, "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const dataUrl: unknown = body?.dataUrl;
  if (typeof dataUrl !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const m = dataUrl.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  if (!m) return NextResponse.json({ error: "bad image" }, { status: 400 });
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "too large" }, { status: 413 });
  }
  const ok = await setTelegramPhoto(bytes, m[1]);
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}

export async function DELETE() {
  const ok = await removeTelegramPhoto();
  return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
}
