import { NextResponse } from "next/server";
import { getTelegramProfile, setTelegramProfile } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getTelegramProfile();
  return NextResponse.json(profile);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const input: { name?: string; shortDescription?: string; description?: string } = {};
  if (typeof body.name === "string") input.name = body.name.slice(0, 64);
  if (typeof body.shortDescription === "string") input.shortDescription = body.shortDescription.slice(0, 120);
  if (typeof body.description === "string") input.description = body.description.slice(0, 512);
  const result = await setTelegramProfile(input);
  const ok = result.name && result.shortDescription && result.description;
  return NextResponse.json({ ok, result });
}
