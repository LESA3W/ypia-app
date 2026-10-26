import { NextResponse } from "next/server";
import { getPhotoData } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return new NextResponse(null, { status: 400 });
  const dataUrl = await getPhotoData(id);
  if (!dataUrl) return new NextResponse(null, { status: 404 });
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return new NextResponse(null, { status: 404 });
  const bytes = Buffer.from(m[2], "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": m[1],
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
