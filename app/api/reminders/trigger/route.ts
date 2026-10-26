import { NextResponse } from "next/server";
import { triggerRoutine, ROUTINE_DEFS } from "@/lib/bot";
import { isDue } from "@/lib/cron";
import type { RoutineKey } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const routineKey = typeof body?.routineKey === "string" ? body.routineKey : "";
  if (!routineKey) return NextResponse.json({ error: "routineKey requis" }, { status: 400 });

  const def = ROUTINE_DEFS[routineKey as RoutineKey];
  const prompt = typeof body?.prompt === "string" && body.prompt.trim() ? body.prompt : def?.prompt;

  // "Run if due": only fire when now (UTC) is within the cron's active window
  if (body?.ifDue === true) {
    const cron = typeof body?.cron === "string" ? body.cron : "";
    if (!cron || !isDue(cron)) {
      return NextResponse.json({ ok: true, skipped: true, reason: "hors fenêtre" });
    }
  }

  try {
    await triggerRoutine(routineKey, prompt);
    return NextResponse.json({ ok: true, skipped: false });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
