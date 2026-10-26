import { NextResponse } from "next/server";
import { getBotUsername } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const username = await getBotUsername();
  return NextResponse.json({
    username,
    url: username ? `https://t.me/${username}` : null,
  });
}
