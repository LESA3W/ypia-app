import { NextResponse } from "next/server";
import { getHistoryLength } from "@/lib/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const total = await getHistoryLength().catch(() => 0);
  return NextResponse.json({ total });
}
