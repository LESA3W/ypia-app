import { NextResponse } from "next/server";
import { deleteSchedule } from "@/lib/qstash";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/reminders/[id]">) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  try {
    await deleteSchedule(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
