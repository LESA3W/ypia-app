import { NextResponse } from "next/server";
import {
  getHeartbeatStatus,
  pingHeartbeatNow,
  createHeartbeat,
  setHeartbeatInterval,
  pauseHeartbeat,
  resumeHeartbeat,
  deleteHeartbeat,
} from "@/lib/heartbeat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getHeartbeatStatus();
  return NextResponse.json(status);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const intervalMin = Number(body?.intervalMin) || 10;
  try {
    switch (action) {
      case "ping":
        await pingHeartbeatNow();
        break;
      case "create":
        await createHeartbeat(intervalMin);
        break;
      case "setInterval":
        await setHeartbeatInterval(intervalMin);
        break;
      case "pause":
        await pauseHeartbeat();
        break;
      case "resume":
        await resumeHeartbeat();
        break;
      case "delete":
        await deleteHeartbeat();
        break;
      default:
        return NextResponse.json({ error: "action inconnue" }, { status: 400 });
    }
    return NextResponse.json({ ok: true, status: await getHeartbeatStatus() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
