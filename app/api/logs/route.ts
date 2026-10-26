import { NextResponse } from "next/server";
import { getRuntimeLogs } from "@/lib/vercel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(10, Number(url.searchParams.get("limit")) || 200));
  const result = await getRuntimeLogs(limit);
  return NextResponse.json({ ...result, fetchedAt: Date.now() });
}
