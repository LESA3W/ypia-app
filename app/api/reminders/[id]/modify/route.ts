import { NextResponse } from "next/server";
import { deleteSchedule, createSchedule, getSchedule } from "@/lib/qstash";
import { addReminderRecord, removeReminderRecord, getReminderRecords } from "@/lib/kv";
import { reminderDestUrl } from "@/lib/bot";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// QStash schedules are immutable -> modify = delete + create new.
export async function POST(request: Request, ctx: RouteContext<"/api/reminders/[id]/modify">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => null);
  const cron = typeof body?.cron === "string" ? body.cron.trim() : "";
  const prompt = typeof body?.prompt === "string" && body.prompt.trim() ? body.prompt.trim() : "Rappel";
  const routineKey = typeof body?.routineKey === "string" ? body.routineKey.trim() : "";

  if (!cron || !routineKey) {
    return NextResponse.json({ error: "cron et routineKey requis" }, { status: 400 });
  }
  if (cron.split(/\s+/).length !== 5) {
    return NextResponse.json({ error: "cron invalide (5 champs)" }, { status: 400 });
  }

  try {
    const existing = await getSchedule(id);
    const desc =
      (await getReminderRecords()).find((r) => r.scheduleId === id)?.desc || routineKey;

    const { scheduleId } = await createSchedule({
      destinationUrl: reminderDestUrl(),
      cron,
      reminderSecret: env.CRON_SECRET,
      body: { chatId: env.BOT_USER_ID, prompt, routineKey },
    });

    if (existing) {
      await deleteSchedule(id);
      await removeReminderRecord(id);
    }
    await addReminderRecord(scheduleId, desc);
    return NextResponse.json({ ok: true, scheduleId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
