import { NextResponse } from "next/server";
import { getVoiceAudio } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id) return new NextResponse(null, { status: 400 });
  const dataUrl = await getVoiceAudio(id);
  if (!dataUrl) return new NextResponse(null, { status: 404 });
  const m = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!m) return new NextResponse(null, { status: 404 });
  const mime = m[1];
  const bytes = Buffer.from(m[2], "base64");
  const total = bytes.length;

  // Safari/iOS require byte-range support (206) to play <audio>; honor Range.
  const range = request.headers.get("range");
  if (range) {
    const match = range.match(/bytes=(\d+)-(\d*)/);
    if (match) {
      const start = parseInt(match[1], 10);
      const end = match[2] ? Math.min(parseInt(match[2], 10), total - 1) : total - 1;
      if (start <= end && start < total) {
        const chunk = bytes.subarray(start, end + 1);
        return new NextResponse(chunk, {
          status: 206,
          headers: {
            "Content-Type": mime,
            "Content-Range": `bytes ${start}-${end}/${total}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunk.length),
            "Cache-Control": "private, max-age=3600",
          },
        });
      }
    }
  }

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(total),
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
