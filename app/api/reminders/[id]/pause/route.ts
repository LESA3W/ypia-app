import { NextResponse } from "next/server";
import { pauseSchedule, resumeSchedule } from "@/lib/qstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, ctx: RouteContext<"/api/reminders/[id]/pause">) {
  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action === "resume" ? "resume" : "pause";
  try {
    if (action === "resume") await resumeSchedule(id);
    else await pauseSchedule(id);
    return NextResponse.json({ ok: true, action });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
