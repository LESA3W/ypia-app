import { NextResponse } from "next/server";
import { getSchedule, createSchedule } from "@/lib/qstash";
import { addReminderRecord, getReminderRecords } from "@/lib/kv";
import { reminderDestUrl } from "@/lib/bot";
import { env } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, ctx: RouteContext<"/api/reminders/[id]/clone">) {
  const { id } = await ctx.params;
  try {
    const sched = await getSchedule(id);
    if (!sched) return NextResponse.json({ error: "schedule introuvable" }, { status: 404 });

    const records = await getReminderRecords();
    const origDesc = records.find((r) => r.scheduleId === id)?.desc || sched.routineKey || "routine";

    const { scheduleId } = await createSchedule({
      destinationUrl: reminderDestUrl(),
      cron: sched.cron,
      reminderSecret: env.CRON_SECRET,
      body: {
        chatId: env.BOT_USER_ID,
        prompt: sched.prompt || "Rappel",
        routineKey: sched.routineKey || "clone",
      },
    });
    await addReminderRecord(scheduleId, `${origDesc} (copie)`);
    return NextResponse.json({ ok: true, scheduleId });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
