import { NextResponse } from "next/server";
import { TRACKED_ENV_VARS } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mask(value: string, secret: boolean): string {
  if (!value) return "";
  if (!secret) return value;
  if (value.length <= 6) return "••••";
  return `••••${value.slice(-3)}`;
}

export async function GET() {
  const vars = TRACKED_ENV_VARS.map((v) => {
    const raw = (process.env[v.name] || "").trim();
    return {
      name: v.name,
      group: v.group,
      present: raw.length > 0,
      masked: mask(raw, v.secret),
      secret: v.secret,
    };
  });
  return NextResponse.json({ vars });
}
