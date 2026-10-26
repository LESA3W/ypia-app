import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pingKv } from "@/lib/kv";
import { pingQstash } from "@/lib/qstash";
import { pingVercel } from "@/lib/vercel";
import { pingBot } from "@/lib/bot";
import { fetchWithTimeout } from "@/lib/http";
import type { PingResult } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function pingAnthropic(): Promise<string> {
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY absent (var sensitive Vercel)");
  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: 1,
      messages: [{ role: "user", content: "ping" }],
    }),
    timeoutMs: 12000,
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}`);
  return "ok";
}

const TARGETS: Record<string, () => Promise<string>> = {
  kv: pingKv,
  qstash: pingQstash,
  vercel: pingVercel,
  bot: pingBot,
  anthropic: pingAnthropic,
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const target = typeof body?.target === "string" ? body.target : "";
  const fn = TARGETS[target];
  if (!fn) return NextResponse.json({ error: "target inconnu" }, { status: 400 });

  const start = Date.now();
  let result: PingResult;
  try {
    const detail = await fn();
    result = { target, ok: true, latencyMs: Date.now() - start, detail };
  } catch (e) {
    result = {
      target,
      ok: false,
      latencyMs: Date.now() - start,
      detail: (e as Error).message.slice(0, 160),
    };
  }
  return NextResponse.json(result);
}
