import { NextResponse } from "next/server";
import { createSchedule } from "@/lib/qstash";
import { reminderDestUrl } from "@/lib/bot";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const routineKey = typeof body?.routineKey === "string" ? body.routineKey.trim() : "";
  const cron = typeof body?.cron === "string" ? body.cron.trim() : "";
  const prompt = typeof body?.prompt === "string" && body.prompt.trim() ? body.prompt.trim() : "Rappel";

  if (!routineKey || !cron) {
    return NextResponse.json({ error: "routineKey et cron requis" }, { status: 400 });
  }
  // basic cron sanity: 5 space-separated fields
  if (cron.split(/\s+/).length !== 5) {
    return NextResponse.json({ error: "cron invalide (5 champs attendus)" }, { status: 400 });
  }

  try {
    const { scheduleId } = await createSchedule({
      destinationUrl: reminderDestUrl(),
      cron,
      reminderSecret: env.CRON_SECRET,
      body: { chatId: env.BOT_USER_ID, prompt, routineKey },
    });
    return NextResponse.json({ ok: true, scheduleId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
