import { NextResponse } from "next/server";
import { getScheduleEvents } from "@/lib/qstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: RouteContext<"/api/reminders/[id]/history">) {
  const { id } = await ctx.params;
  try {
    const events = await getScheduleEvents(id, 25);
    return NextResponse.json({ events });
  } catch (e) {
    return NextResponse.json({ events: [], error: (e as Error).message }, { status: 200 });
  }
}
